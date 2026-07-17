package com.example.budgetbuddy.model;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "inventory_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryItem {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String description;
    
    @Column
    private Long quantity;
    
    @Column
    private String unit;
    
    @Column
    private String location;
    
    @Column
    private String linkedExpenseId;

    @PrePersist
    void generateId() {
        if (id == null) id = UUID.randomUUID().toString();
    }
}
