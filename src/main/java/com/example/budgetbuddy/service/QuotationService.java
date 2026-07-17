package com.example.budgetbuddy.service;

import com.example.budgetbuddy.model.Quotation;
import com.example.budgetbuddy.repository.QuotationRepository;
import com.example.budgetbuddy.repository.ProposalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class QuotationService {
    private final QuotationRepository quotationRepository;
    private final ProposalRepository proposalRepository;
    
    public List<Quotation> getAllQuotations() {
        return quotationRepository.findAll();
    }
    
    public List<Quotation> getQuotationsByStatus(Quotation.Status status) {
        return quotationRepository.findByStatus(status);
    }
    
    public Optional<Quotation> getQuotationById(String id) {
        return quotationRepository.findById(id);
    }
    
    public Quotation createQuotation(Quotation quotation) {
        return quotationRepository.save(quotation);
    }
    
    public Quotation updateQuotation(String id, Quotation quotation) {
        return quotationRepository.findById(id).map(existing -> {
            existing.setTitle(quotation.getTitle());
            existing.setItems(quotation.getItems());
            return quotationRepository.save(existing);
        }).orElseThrow(() -> new RuntimeException("Quotation not found"));
    }
    
    public Quotation closeQuotation(String id, String winnerProposalId) {
        return quotationRepository.findById(id).map(quotation -> {
            quotation.setStatus(Quotation.Status.encerrada);
            quotation.setWinnerProposalId(winnerProposalId);
            quotation.setClosedAt(java.time.LocalDateTime.now());
            return quotationRepository.save(quotation);
        }).orElseThrow(() -> new RuntimeException("Quotation not found"));
    }
    
    public Quotation reopenQuotation(String id) {
        return quotationRepository.findById(id).map(quotation -> {
            quotation.setStatus(Quotation.Status.aberta);
            quotation.setClosedAt(null);
            quotation.setWinnerProposalId(null);
            return quotationRepository.save(quotation);
        }).orElseThrow(() -> new RuntimeException("Quotation not found"));
    }
    
    public void deleteQuotation(String id) {
        quotationRepository.deleteById(id);
    }
}
