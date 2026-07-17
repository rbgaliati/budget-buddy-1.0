package com.example.budgetbuddy.controller;

import com.example.budgetbuddy.service.CsvImportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/import")
@CrossOrigin("*")
public class CsvImportController {

    @Autowired
    private CsvImportService csvImportService;

    /**
     * POST /api/import/csv
     * Recebe um arquivo CSV (multipart/form-data, campo "file") e importa despesas.
     */
    @PostMapping(value = "/csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> importCsv(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Arquivo CSV vazio."
            ));
        }
        Map<String, Object> result = csvImportService.importCsv(file);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/import/csv/template
     * Retorna um arquivo CSV de template para download.
     */
    @GetMapping("/csv/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        String template =
            "etapa;descricao;fornecedor;valor_total;data;forma_pagamento;tipo_comprovante;pendencia;nota_pendencia;vencimento;valor_parcela;conta;pago\n" +
            "01 - Planejamento;Análise topográfica;Fornecedor Exemplo;600.00;2024-07-25;avista;sem_comprovante;nao;;2024-07-25;600.00;Conta Principal;sim\n" +
            "01 - Planejamento;Projeto Executivo;Engenheiro Exemplo;9000.00;2025-04-01;parcelado;sem_comprovante;nao;;2024-04-01;3000.00;Conta Principal;sim\n" +
            "01 - Planejamento;Projeto Executivo;Engenheiro Exemplo;9000.00;2025-04-01;parcelado;sem_comprovante;nao;;2025-05-01;3000.00;Conta Principal;sim\n" +
            "01 - Planejamento;Projeto Executivo;Engenheiro Exemplo;9000.00;2025-04-01;parcelado;sem_comprovante;nao;;2025-06-01;3000.00;Conta Principal;nao\n";

        byte[] bytes = template.getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"template_despesas.csv\"")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .body(bytes);
    }
}
