package com.example.budgetbuddy.controller;

import com.example.budgetbuddy.dto.BackupImportDto;
import com.example.budgetbuddy.service.ImportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/import")
@CrossOrigin("*")
public class ImportController {

    @Autowired
    private ImportService importService;

    @PostMapping("/backup")
    public ResponseEntity<Map<String, Object>> importBackup(@RequestBody BackupImportDto backup) {
        try {
            Map<String, Object> result = importService.importBackup(backup);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Erro na importação: " + e.getMessage());
            error.put("error", e.getClass().getSimpleName() + ": " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
