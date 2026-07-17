package com.example.budgetbuddy.model;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "proposals")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Proposal {
    @Id
    private String id;
    
    @Column
    private String supplier;
    
    @Column
    private BigDecimal total;
    
    @Column
    private BigDecimal discountPercent;
    
    @Column
    private String notes;
    
    @OneToMany(mappedBy = "proposal", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("proposal-prices")
    private List<ProposalPrice> prices = new ArrayList<>();
    
    @ManyToOne
    @JoinColumn(name = "quotation_id")
    @JsonBackReference("quotation-proposals")
    private Quotation quotation;

    @PrePersist
    void generateId() {
        if (id == null) id = UUID.randomUUID().toString();
    }
}
