package com.example.budgetbuddy.service;

import com.example.budgetbuddy.dto.BackupImportDto;
import com.example.budgetbuddy.model.*;
import com.example.budgetbuddy.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class ImportService {

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private StageRepository stageRepository;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private ExpenseRepository expenseRepository;
    @Autowired
    private ExpenseItemRepository expenseItemRepository;
    @Autowired
    private InstallmentRepository installmentRepository;
    @Autowired
    private QuotationRepository quotationRepository;
    @Autowired
    private QuotationItemRepository quotationItemRepository;
    @Autowired
    private ProposalRepository proposalRepository;
    @Autowired
    private ProposalPriceRepository proposalPriceRepository;

    private static final DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Transactional
    public Map<String, Object> importBackup(BackupImportDto backup) {
        Map<String, Object> result = new HashMap<>();
        int stagesCount = 0, accountsCount = 0, expensesCount = 0, quotationsCount = 0;

        // Clear existing data in correct FK order
        proposalPriceRepository.deleteAll();
        proposalRepository.deleteAll();
        quotationItemRepository.deleteAll();
        quotationRepository.deleteAll();
        installmentRepository.deleteAll();
        expenseItemRepository.deleteAll();
        expenseRepository.deleteAll();
        stageRepository.deleteAll();
        accountRepository.deleteAll();
        entityManager.flush();
        entityManager.clear();

        // Import Stages
        Map<String, Stage> stageMap = new HashMap<>();
        if (backup.stages != null) {
            for (BackupImportDto.StageDto stageDto : backup.stages) {
                Stage stage = new Stage();
                stage.setId(stageDto.id);
                stage.setName(stageDto.name);
                stage.setPlanned(stageDto.planned);
                entityManager.persist(stage);
                stageMap.put(stageDto.id, stage);
                stagesCount++;
            }
            entityManager.flush();
        }

        // Import Accounts
        Map<String, Account> accountMap = new HashMap<>();
        if (backup.accounts != null) {
            for (BackupImportDto.AccountDto accountDto : backup.accounts) {
                Account account = new Account();
                account.setId(accountDto.id);
                account.setName(accountDto.name);
                try {
                    account.setType(Account.AccountType.valueOf(accountDto.type));
                } catch (Exception e) {
                    account.setType(Account.AccountType.conta);
                }
                entityManager.persist(account);
                accountMap.put(accountDto.id, account);
                accountsCount++;
            }
            entityManager.flush();
        }

        // Import Expenses
        if (backup.expenses != null) {
            for (BackupImportDto.ExpenseDto expenseDto : backup.expenses) {
                Expense expense = new Expense();
                expense.setId(expenseDto.id);
                Stage stage = stageMap.get(expenseDto.stageId);
                if (stage != null) {
                    expense.setStage(stage);
                }
                expense.setDescription(expenseDto.description);
                expense.setSupplier(expenseDto.supplier);
                expense.setAmount(expenseDto.amount);
                if (expenseDto.date != null) {
                    expense.setDate(LocalDate.parse(expenseDto.date, dateFormatter));
                }
                try {
                    expense.setPaymentMethod(Expense.PaymentMethod.valueOf(expenseDto.paymentMethod));
                } catch (Exception e) {
                    expense.setPaymentMethod(Expense.PaymentMethod.avista);
                }
                try {
                    expense.setReceiptType(Expense.ReceiptType.valueOf(expenseDto.receiptType));
                } catch (Exception e) {
                    expense.setReceiptType(Expense.ReceiptType.sem_comprovante);
                }
                expense.setHasPendency(expenseDto.hasPendency != null && expenseDto.hasPendency);
                expense.setPendencyNote(expenseDto.pendencyNote != null ? expenseDto.pendencyNote : "");
                expense.setInvoiceNumber(expenseDto.invoiceNumber);
                entityManager.persist(expense);
                expensesCount++;

                if (expenseDto.items != null) {
                    for (BackupImportDto.ItemDto itemDto : expenseDto.items) {
                        ExpenseItem item = new ExpenseItem();
                        item.setId(itemDto.id);
                        item.setExpense(expense);
                        try {
                            item.setKind(ExpenseItem.ItemKind.valueOf(itemDto.kind));
                        } catch (Exception e) {
                            item.setKind(ExpenseItem.ItemKind.material);
                        }
                        item.setDescription(itemDto.description);
                        item.setUnit(itemDto.unit);
                        item.setQuantity(itemDto.quantity);
                        item.setUnitValue(itemDto.unitValue);
                        entityManager.persist(item);
                    }
                }

                if (expenseDto.installments != null) {
                    for (BackupImportDto.InstallmentDto instDto : expenseDto.installments) {
                        Installment installment = new Installment();
                        installment.setId(instDto.id);
                        installment.setExpense(expense);
                        if (instDto.dueDate != null) {
                            installment.setDueDate(LocalDate.parse(instDto.dueDate, dateFormatter));
                        }
                        installment.setAmount(instDto.amount);
                        installment.setPaid(instDto.paid != null && instDto.paid);
                        Account account = accountMap.get(instDto.accountId);
                        if (account != null) {
                            installment.setAccount(account);
                        }
                        entityManager.persist(installment);
                    }
                }
            }
            entityManager.flush();
        }

        if (backup.quotations != null) {
            for (BackupImportDto.QuotationDto quotationDto : backup.quotations) {
                Quotation quotation = new Quotation();
                quotation.setId(quotationDto.id);
                quotation.setTitle(quotationDto.name != null ? quotationDto.name : quotationDto.title);
                try {
                    String status = quotationDto.status;
                    if ("encerrado".equals(status)) {
                        quotation.setStatus(Quotation.Status.encerrada);
                    } else if ("aberto".equals(status)) {
                        quotation.setStatus(Quotation.Status.aberta);
                    } else {
                        quotation.setStatus(Quotation.Status.valueOf(status));
                    }
                } catch (Exception e) {
                    quotation.setStatus(Quotation.Status.aberta);
                }
                try {
                    quotation.setCreatedAt(LocalDateTime.parse(quotationDto.createdAt.replace("Z", "+00:00")));
                } catch (Exception e) {
                    quotation.setCreatedAt(LocalDateTime.now());
                }
                quotation.setWinnerProposalId(quotationDto.winnerProposalId);
                quotation.setWinnerJustification(quotationDto.winnerJustification);
                entityManager.persist(quotation);
                quotationsCount++;

                if (quotationDto.items != null) {
                    for (BackupImportDto.QuotationItemDto itemDto : quotationDto.items) {
                        QuotationItem item = new QuotationItem();
                        item.setId(itemDto.id);
                        item.setQuotation(quotation);
                        item.setDescription(itemDto.description);
                        item.setUnit(itemDto.unit);
                        item.setQuantity(itemDto.quantity);
                        entityManager.persist(item);
                    }
                }

                if (quotationDto.proposals != null) {
                    for (BackupImportDto.ProposalDto proposalDto : quotationDto.proposals) {
                        Proposal proposal = new Proposal();
                        proposal.setId(proposalDto.id);
                        proposal.setSupplier(proposalDto.supplier);
                        proposal.setNotes(proposalDto.proposalNumber);
                        proposal.setDiscountPercent(proposalDto.discountPercent);
                        proposal.setQuotation(quotation);
                        entityManager.persist(proposal);

                        if (proposalDto.prices != null) {
                            for (String itemId : proposalDto.prices.keySet()) {
                                ProposalPrice price = new ProposalPrice();
                                price.setItemId(itemId);
                                price.setUnitPrice(proposalDto.prices.get(itemId));
                                price.setProposal(proposal);
                                entityManager.persist(price);
                            }
                        }
                    }
                }
            }
            entityManager.flush();
        }

        result.put("success", true);
        result.put("message", String.format(
            "Importa\u00e7\u00e3o conclu\u00edda! Etapas: %d, Contas: %d, Despesas: %d, Cota\u00e7\u00f5es: %d",
            stagesCount, accountsCount, expensesCount, quotationsCount
        ));
        result.put("stats", Map.of(
            "stages", stagesCount,
            "accounts", accountsCount,
            "expenses", expensesCount,
            "quotations", quotationsCount
        ));
        return result;
    }
}