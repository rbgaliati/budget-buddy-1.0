package com.example.budgetbuddy.repository;

import com.example.budgetbuddy.model.ProposalPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProposalPriceRepository extends JpaRepository<ProposalPrice, String> {
    List<ProposalPrice> findByProposalId(String proposalId);
}
