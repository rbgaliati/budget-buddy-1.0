package com.example.budgetbuddy.repository;

import com.example.budgetbuddy.model.Installment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InstallmentRepository extends JpaRepository<Installment, String> {
    List<Installment> findByExpenseId(String expenseId);
}
