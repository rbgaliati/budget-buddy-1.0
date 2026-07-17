package com.example.budgetbuddy.service;

import com.example.budgetbuddy.model.Expense;
import com.example.budgetbuddy.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ExpenseService {
    private final ExpenseRepository expenseRepository;
    
    public List<Expense> getAllExpenses() {
        return expenseRepository.findAll();
    }
    
    public Optional<Expense> getExpenseById(String id) {
        return expenseRepository.findById(id);
    }
    
    public List<Expense> getExpensesByFilters(String stageId, LocalDate fromDate, LocalDate toDate) {
        return expenseRepository.findByFilters(stageId, fromDate, toDate);
    }
    
    public List<Expense> getExpensesByStageId(String stageId) {
        return expenseRepository.findByStageId(stageId);
    }
    
    public Expense createExpense(Expense expense) {
        return expenseRepository.save(expense);
    }
    
    public Expense updateExpense(String id, Expense expense) {
        return expenseRepository.findById(id).map(existing -> {
            existing.setStage(expense.getStage());
            existing.setDescription(expense.getDescription());
            existing.setSupplier(expense.getSupplier());
            existing.setAmount(expense.getAmount());
            existing.setDate(expense.getDate());
            existing.setPaymentMethod(expense.getPaymentMethod());
            existing.setReceiptType(expense.getReceiptType());
            existing.setHasPendency(expense.isHasPendency());
            existing.setPendencyNote(expense.getPendencyNote());
            return expenseRepository.save(existing);
        }).orElseThrow(() -> new RuntimeException("Expense not found"));
    }
    
    public void deleteExpense(String id) {
        expenseRepository.deleteById(id);
    }
}
