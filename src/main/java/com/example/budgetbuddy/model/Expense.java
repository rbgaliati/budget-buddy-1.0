package com.example.budgetbuddy.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "expenses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {
    @Id
    private String id;
    
    @ManyToOne
    @JoinColumn(name = "stage_id")
    private Stage stage;
    
    @Column
    private String description;
    
    @Column
    private String supplier;
    
    @Column
    private BigDecimal amount;
    
    @Column
    private LocalDate date;
    
    @Column
    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod;
    
    @Column
    @Enumerated(EnumType.STRING)
    private ReceiptType receiptType;
    
    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("expense-installments")
    private List<Installment> installments = new ArrayList<>();
    
    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("expense-items")
    private List<ExpenseItem> items = new ArrayList<>();
    
    @Column
    private boolean hasPendency;
    
    @Column
    private String pendencyNote;
    
    public enum PaymentMethod {
        avista, boleto, cartao, parcelado
    }
    
    public enum ReceiptType {
        nota_fiscal, recibo, sem_comprovante
    }

    @PrePersist
    void generateId() {
        if (id == null) id = UUID.randomUUID().toString();
    }
}
