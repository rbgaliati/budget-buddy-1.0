package com.example.budgetbuddy.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Entity
@Table(name = "expense_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseItem {
    @Id
    private String id;
    
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ItemKind kind;
    
    @Column(nullable = false)
    private String description;
    
    @Column
    private String unit;
    
    @Column
    private BigDecimal quantity;
    
    @Column
    private BigDecimal unitValue;
    
    @ManyToOne
    @JoinColumn(name = "expense_id")
    @JsonBackReference("expense-items")
    private Expense expense;
    
    public enum ItemKind {
        material, servico, taxas
    }

    @PrePersist
    void generateId() {
        if (id == null) id = UUID.randomUUID().toString();
    }
}
