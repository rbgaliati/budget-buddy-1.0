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
@Table(name = "quotation_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuotationItem {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String description;
    
    @Column
    private BigDecimal quantity;
    
    @Column
    private String unit;
    
    @ManyToOne
    @JoinColumn(name = "quotation_id")
    @JsonBackReference("quotation-items")
    private Quotation quotation;

    @PrePersist
    void generateId() {
        if (id == null) id = UUID.randomUUID().toString();
    }
}
