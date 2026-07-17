package com.example.budgetbuddy.service;

import com.example.budgetbuddy.model.*;
import com.example.budgetbuddy.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Importa despesas a partir de um arquivo CSV com separador ponto-e-vírgula (;).
 *
 * Formato do CSV (primeira linha = cabeçalho):
 * etapa;descricao;fornecedor;valor_total;data;forma_pagamento;tipo_comprovante;pendencia;nota_pendencia;vencimento;valor_parcela;conta;pago
 *
 * - Uma linha por parcela. Despesas com múltiplas parcelas usam múltiplas linhas com os mesmos
 *   campos de despesa (etapa, descricao, fornecedor, valor_total, data, forma_pagamento).
 * - Etapas e contas são criadas automaticamente se não existirem.
 * - Valores decimais usam ponto (.) como separador.
 * - Datas no formato yyyy-MM-dd.
 * - pendencia: sim/nao ou true/false
 * - pago: sim/nao ou true/false
 */
@Service
public class CsvImportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final String DELIMITER = ";";
    private static final int COL_ETAPA = 0;
    private static final int COL_DESCRICAO = 1;
    private static final int COL_FORNECEDOR = 2;
    private static final int COL_VALOR_TOTAL = 3;
    private static final int COL_DATA = 4;
    private static final int COL_FORMA_PAG = 5;
    private static final int COL_TIPO_COMP = 6;
    private static final int COL_PENDENCIA = 7;
    private static final int COL_NOTA_PENDENCIA = 8;
    private static final int COL_VENCIMENTO = 9;
    private static final int COL_VALOR_PARCELA = 10;
    private static final int COL_CONTA = 11;
    private static final int COL_PAGO = 12;
    private static final int MIN_COLS = 13;

    @Autowired private StageRepository stageRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private ExpenseItemRepository expenseItemRepository;
    @Autowired private InstallmentRepository installmentRepository;

    @Transactional
    public Map<String, Object> importCsv(MultipartFile file) {
        Map<String, Object> result = new HashMap<>();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            List<String[]> rows = new ArrayList<>();
            String line;
            boolean firstLine = true;

            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) continue;

                // Pular BOM UTF-8 se presente
                if (firstLine && line.startsWith("\uFEFF")) {
                    line = line.substring(1);
                }

                if (firstLine) {
                    firstLine = false;
                    // Se for o cabeçalho, pular
                    if (line.toLowerCase().startsWith("etapa")) continue;
                }

                String[] cols = line.split(DELIMITER, -1);
                if (cols.length < MIN_COLS) {
                    // Linha incompleta — pular
                    continue;
                }
                rows.add(cols);
            }

            if (rows.isEmpty()) {
                result.put("success", false);
                result.put("message", "Arquivo CSV vazio ou sem linhas válidas.");
                return result;
            }

            // Cache de etapas e contas por nome (case-insensitive)
            Map<String, Stage> stageCache = new LinkedHashMap<>();
            Map<String, Account> accountCache = new LinkedHashMap<>();

            // Pré-carregar existentes
            stageRepository.findAll().forEach(s -> stageCache.put(s.getName().toLowerCase(), s));
            accountRepository.findAll().forEach(a -> accountCache.put(a.getName().toLowerCase(), a));

            // Agrupar linhas por chave de despesa: etapa+descricao+fornecedor+valor_total+data
            LinkedHashMap<String, List<String[]>> expenseGroups = new LinkedHashMap<>();
            for (String[] cols : rows) {
                String key = buildExpenseKey(cols);
                expenseGroups.computeIfAbsent(key, k -> new ArrayList<>()).add(cols);
            }

            int expensesCreated = 0;
            int installmentsCreated = 0;
            List<String> warnings = new ArrayList<>();

            for (Map.Entry<String, List<String[]>> entry : expenseGroups.entrySet()) {
                List<String[]> group = entry.getValue();
                String[] first = group.get(0);

                // Encontrar ou criar Stage
                String stageName = first[COL_ETAPA].trim();
                Stage stage = findOrCreateStage(stageName, stageCache);

                // Criar Expense
                Expense expense = new Expense();
                expense.setStage(stage);
                expense.setDescription(first[COL_DESCRICAO].trim());
                expense.setSupplier(first[COL_FORNECEDOR].trim());
                expense.setAmount(parseBigDecimal(first[COL_VALOR_TOTAL], BigDecimal.ZERO));

                String dateStr = first[COL_DATA].trim();
                expense.setDate(parseDate(dateStr));

                expense.setPaymentMethod(parsePaymentMethod(first[COL_FORMA_PAG]));
                expense.setReceiptType(parseReceiptType(first[COL_TIPO_COMP]));
                expense.setHasPendency(parseBoolean(first[COL_PENDENCIA]));
                expense.setPendencyNote(first[COL_NOTA_PENDENCIA].trim());

                Expense savedExpense = expenseRepository.save(expense);
                expensesCreated++;

                // Criar parcelas
                for (String[] row : group) {
                    String vencStr = row[COL_VENCIMENTO].trim();
                    String valorParcelaStr = row[COL_VALOR_PARCELA].trim();

                    if (vencStr.isEmpty() && valorParcelaStr.isEmpty()) {
                        // Linha sem dados de parcela — pular
                        continue;
                    }

                    Installment inst = new Installment();
                    inst.setExpense(savedExpense);
                    inst.setDueDate(parseDate(vencStr));
                    inst.setAmount(parseBigDecimal(valorParcelaStr, BigDecimal.ZERO));
                    inst.setPaid(parseBoolean(row[COL_PAGO]));

                    String accountName = row[COL_CONTA].trim();
                    if (!accountName.isEmpty()) {
                        Account account = findOrCreateAccount(accountName, accountCache);
                        inst.setAccount(account);
                    }

                    installmentRepository.save(inst);
                    installmentsCreated++;
                }
            }

            result.put("success", true);
            result.put("message", String.format(
                "Importação CSV concluída! Despesas: %d, Parcelas: %d",
                expensesCreated, installmentsCreated));
            result.put("stats", Map.of(
                "expenses", expensesCreated,
                "installments", installmentsCreated
            ));
            if (!warnings.isEmpty()) {
                result.put("warnings", warnings);
            }

        } catch (Exception e) {
            e.printStackTrace();
            result.put("success", false);
            result.put("message", "Erro ao processar CSV: " + e.getMessage());
            result.put("error", e.toString());
        }

        return result;
    }

    // ---- helpers ----

    private String buildExpenseKey(String[] cols) {
        return String.join("|",
            cols[COL_ETAPA].trim().toLowerCase(),
            cols[COL_DESCRICAO].trim().toLowerCase(),
            cols[COL_FORNECEDOR].trim().toLowerCase(),
            cols[COL_VALOR_TOTAL].trim(),
            cols[COL_DATA].trim()
        );
    }

    private Stage findOrCreateStage(String name, Map<String, Stage> cache) {
        String key = name.toLowerCase();
        if (cache.containsKey(key)) return cache.get(key);

        Stage stage = new Stage();
        stage.setName(name);
        stage.setPlanned(BigDecimal.ZERO);
        Stage saved = stageRepository.save(stage);
        cache.put(key, saved);
        return saved;
    }

    private Account findOrCreateAccount(String name, Map<String, Account> cache) {
        String key = name.toLowerCase();
        if (cache.containsKey(key)) return cache.get(key);

        Account account = new Account();
        account.setName(name);
        account.setType(Account.AccountType.conta);
        Account saved = accountRepository.save(account);
        cache.put(key, saved);
        return saved;
    }

    private BigDecimal parseBigDecimal(String value, BigDecimal fallback) {
        try {
            return new BigDecimal(value.trim().replace(",", "."));
        } catch (Exception e) {
            return fallback;
        }
    }

    private LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value.trim(), DATE_FMT);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    private boolean parseBoolean(String value) {
        String v = value.trim().toLowerCase();
        return "sim".equals(v) || "true".equals(v) || "1".equals(v) || "s".equals(v);
    }

    private Expense.PaymentMethod parsePaymentMethod(String value) {
        try {
            return Expense.PaymentMethod.valueOf(value.trim().toLowerCase());
        } catch (Exception e) {
            return Expense.PaymentMethod.avista;
        }
    }

    private Expense.ReceiptType parseReceiptType(String value) {
        try {
            return Expense.ReceiptType.valueOf(value.trim().toLowerCase());
        } catch (Exception e) {
            return Expense.ReceiptType.sem_comprovante;
        }
    }
}
