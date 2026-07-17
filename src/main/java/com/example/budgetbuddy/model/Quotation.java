package com.example.budgetbuddy.model;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quotations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Quotation {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String title;
    
    @Column
    @Enumerated(EnumType.STRING)
    private Status status;
    
    @Column
    private LocalDateTime createdAt;
    
    @Column
    private LocalDateTime closedAt;
    
    @Column
    private String winnerProposalId;
    
    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("quotation-items")
    private List<QuotationItem> items = new ArrayList<>();
    
    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("quotation-proposals")
    private List<Proposal> proposals = new ArrayList<>();
    
    @PrePersist
    private void onCreated() {
        if (id == null) id = UUID.randomUUID().toString();
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = Status.aberta;
    }
    
    public enum Status {
        aberta, encerrada
    }
}
