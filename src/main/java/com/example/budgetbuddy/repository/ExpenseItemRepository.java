package com.example.budgetbuddy.repository;

import com.example.budgetbuddy.model.ExpenseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseItemRepository extends JpaRepository<ExpenseItem, String> {
    List<ExpenseItem> findByExpenseId(String expenseId);
}
