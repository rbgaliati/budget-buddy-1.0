package com.example.budgetbuddy.repository;

import com.example.budgetbuddy.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, String> {
    List<Expense> findByStageId(String stageId);
    
    @Query("SELECT e FROM Expense e WHERE " +
           "(:stageId IS NULL OR e.stage.id = :stageId) AND " +
           "(:fromDate IS NULL OR e.date >= :fromDate) AND " +
           "(:toDate IS NULL OR e.date <= :toDate)")
    List<Expense> findByFilters(@Param("stageId") String stageId,
                                @Param("fromDate") LocalDate fromDate,
                                @Param("toDate") LocalDate toDate);
}
