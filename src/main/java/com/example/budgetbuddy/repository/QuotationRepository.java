package com.example.budgetbuddy.repository;

import com.example.budgetbuddy.model.Quotation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, String> {
    List<Quotation> findByStatus(Quotation.Status status);
}
