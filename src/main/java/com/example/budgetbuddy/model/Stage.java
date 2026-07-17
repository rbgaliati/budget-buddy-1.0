package com.example.budgetbuddy.model;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Entity
@Table(name = "stages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Stage {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column
    private BigDecimal planned;

    @PrePersist
    void generateId() {
        if (id == null) id = UUID.randomUUID().toString();
    }
}
