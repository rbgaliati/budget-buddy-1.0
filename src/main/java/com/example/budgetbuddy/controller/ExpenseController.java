package com.example.budgetbuddy.controller;

import com.example.budgetbuddy.model.Expense;
import com.example.budgetbuddy.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
@CrossOrigin("*")
public class ExpenseController {
    private final ExpenseService expenseService;
    
    @GetMapping
    public ResponseEntity<List<Expense>> getAll(
            @RequestParam(required = false) String stageId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        
        if (stageId != null || from != null || to != null) {
            return ResponseEntity.ok(expenseService.getExpensesByFilters(stageId, from, to));
        }
        return ResponseEntity.ok(expenseService.getAllExpenses());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Expense> getById(@PathVariable String id) {
        return expenseService.getExpenseById(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<Expense> create(@RequestBody Expense expense) {
        return ResponseEntity.status(HttpStatus.CREATED).body(expenseService.createExpense(expense));
    }
    
    @PatchMapping("/{id}")
    public ResponseEntity<Expense> update(@PathVariable String id, @RequestBody Expense expense) {
        return ResponseEntity.ok(expenseService.updateExpense(id, expense));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        expenseService.deleteExpense(id);
        return ResponseEntity.noContent().build();
    }
}
