package com.example.budgetbuddy.model;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonBackReference;
import java.math.BigDecimal;

@Entity
@Table(name = "proposal_prices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProposalPrice {
    @Id
    private String id;
    
    @Column
    private String itemId;
    
    @Column
    private BigDecimal unitPrice;
    
    @ManyToOne
    @JoinColumn(name = "proposal_id")
    @JsonBackReference("proposal-prices")
    private Proposal proposal;

    @PrePersist
    void generateId() {
        if (id == null) id = UUID.randomUUID().toString();
    }
}
