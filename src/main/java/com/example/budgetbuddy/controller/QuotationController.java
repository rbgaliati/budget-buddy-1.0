package com.example.budgetbuddy.controller;

import com.example.budgetbuddy.model.Quotation;
import com.example.budgetbuddy.service.QuotationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quotations")
@RequiredArgsConstructor
@CrossOrigin("*")
public class QuotationController {
    private final QuotationService quotationService;
    
    @GetMapping
    public ResponseEntity<List<Quotation>> getAll(
            @RequestParam(required = false) String status) {
        if (status != null) {
            return ResponseEntity.ok(quotationService.getQuotationsByStatus(Quotation.Status.valueOf(status)));
        }
        return ResponseEntity.ok(quotationService.getAllQuotations());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Quotation> getById(@PathVariable String id) {
        return quotationService.getQuotationById(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<Quotation> create(@RequestBody Quotation quotation) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quotationService.createQuotation(quotation));
    }
    
    @PatchMapping("/{id}")
    public ResponseEntity<Quotation> update(@PathVariable String id, @RequestBody Quotation quotation) {
        return ResponseEntity.ok(quotationService.updateQuotation(id, quotation));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        quotationService.deleteQuotation(id);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{id}/close")
    public ResponseEntity<Quotation> closeQuotation(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String winnerProposalId = payload.get("winnerProposalId");
        return ResponseEntity.ok(quotationService.closeQuotation(id, winnerProposalId));
    }
    
    @PostMapping("/{id}/reopen")
    public ResponseEntity<Quotation> reopenQuotation(@PathVariable String id) {
        return ResponseEntity.ok(quotationService.reopenQuotation(id));
    }
}
