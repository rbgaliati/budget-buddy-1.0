package com.example.budgetbuddy.dto;

import java.util.List;
import java.math.BigDecimal;
import java.util.Map;

public class BackupImportDto {
    public String projectName;
    public List<StageDto> stages;
    public List<AccountDto> accounts;
    public List<ExpenseDto> expenses;
    public List<QuotationDto> quotations;

    public static class StageDto {
        public String id;
        public String name;
        public BigDecimal planned;
    }

    public static class AccountDto {
        public String id;
        public String name;
        public String type;
    }

    public static class ExpenseDto {
        public String id;
        public String stageId;
        public String description;
        public String supplier;
        public BigDecimal amount;
        public String date;
        public String paymentMethod;
        public String receiptType;
        public List<ItemDto> items;
        public Boolean hasPendency;
        public String pendencyNote;
        public List<InstallmentDto> installments;
    }

    public static class ItemDto {
        public String id;
        public String kind;
        public String description;
        public String unit;
        public BigDecimal quantity;
        public BigDecimal unitValue;
    }

    public static class InstallmentDto {
        public String id;
        public String dueDate;
        public BigDecimal amount;
        public Boolean paid;
        public String accountId;
    }

    public static class QuotationDto {
        public String id;
        public String name;
        public String title;
        public String createdAt;
        public String status;
        public String winnerProposalId;
        public String winnerJustification;
        public List<QuotationItemDto> items;
        public List<ProposalDto> proposals;
    }

    public static class QuotationItemDto {
        public String id;
        public String description;
        public String unit;
        public BigDecimal quantity;
    }

    public static class ProposalDto {
        public String id;
        public String supplier;
        public String proposalNumber;
        public BigDecimal discountPercent;
        public Map<String, BigDecimal> prices;
    }
}
