package com.example.budgetbuddy.controller;

import com.example.budgetbuddy.dto.BackupImportDto;
import com.example.budgetbuddy.model.*;
import com.example.budgetbuddy.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/export")
@CrossOrigin("*")
public class ExportController {

    @Autowired private StageRepository stageRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private QuotationRepository quotationRepository;

    @GetMapping("/backup")
    public ResponseEntity<BackupImportDto> exportBackup() {
        BackupImportDto backup = new BackupImportDto();
        backup.projectName = "Minha Obra";

        backup.stages = stageRepository.findAll().stream().map(s -> {
            BackupImportDto.StageDto dto = new BackupImportDto.StageDto();
            dto.id = s.getId();
            dto.name = s.getName();
            dto.planned = s.getPlanned();
            return dto;
        }).collect(Collectors.toList());

        backup.accounts = accountRepository.findAll().stream().map(a -> {
            BackupImportDto.AccountDto dto = new BackupImportDto.AccountDto();
            dto.id = a.getId();
            dto.name = a.getName();
            dto.type = a.getType() != null ? a.getType().name() : "conta";
            return dto;
        }).collect(Collectors.toList());

        backup.expenses = expenseRepository.findAll().stream().map(e -> {
            BackupImportDto.ExpenseDto dto = new BackupImportDto.ExpenseDto();
            dto.id = e.getId();
            dto.stageId = e.getStage() != null ? e.getStage().getId() : null;
            dto.description = e.getDescription();
            dto.supplier = e.getSupplier();
            dto.amount = e.getAmount();
            dto.date = e.getDate() != null ? e.getDate().toString() : null;
            dto.paymentMethod = e.getPaymentMethod() != null ? e.getPaymentMethod().name() : "avista";
            dto.receiptType = e.getReceiptType() != null ? e.getReceiptType().name() : "sem_comprovante";
            dto.hasPendency = e.isHasPendency();
            dto.pendencyNote = e.getPendencyNote();

            dto.items = e.getItems().stream().map(i -> {
                BackupImportDto.ItemDto iDto = new BackupImportDto.ItemDto();
                iDto.id = i.getId();
                iDto.kind = i.getKind() != null ? i.getKind().name() : "material";
                iDto.description = i.getDescription();
                iDto.unit = i.getUnit();
                iDto.quantity = i.getQuantity();
                iDto.unitValue = i.getUnitValue();
                return iDto;
            }).collect(Collectors.toList());

            dto.installments = e.getInstallments().stream().map(inst -> {
                BackupImportDto.InstallmentDto iDto = new BackupImportDto.InstallmentDto();
                iDto.id = inst.getId();
                iDto.dueDate = inst.getDueDate() != null ? inst.getDueDate().toString() : null;
                iDto.amount = inst.getAmount();
                iDto.paid = inst.isPaid();
                iDto.accountId = inst.getAccount() != null ? inst.getAccount().getId() : null;
                return iDto;
            }).collect(Collectors.toList());

            return dto;
        }).collect(Collectors.toList());

        backup.quotations = quotationRepository.findAll().stream().map(q -> {
            BackupImportDto.QuotationDto dto = new BackupImportDto.QuotationDto();
            dto.id = q.getId();
            dto.name = q.getTitle();
            dto.title = q.getTitle();
            dto.createdAt = q.getCreatedAt() != null ? q.getCreatedAt().toString() : null;
            dto.status = q.getStatus() != null
                    ? (q.getStatus() == Quotation.Status.encerrada ? "encerrado" : "aberto")
                    : "aberto";
            dto.winnerProposalId = q.getWinnerProposalId();
            dto.winnerJustification = q.getWinnerJustification();

            dto.items = q.getItems().stream().map(i -> {
                BackupImportDto.QuotationItemDto iDto = new BackupImportDto.QuotationItemDto();
                iDto.id = i.getId();
                iDto.description = i.getDescription();
                iDto.unit = i.getUnit();
                iDto.quantity = i.getQuantity();
                return iDto;
            }).collect(Collectors.toList());

            dto.proposals = q.getProposals().stream().map(p -> {
                BackupImportDto.ProposalDto pDto = new BackupImportDto.ProposalDto();
                pDto.id = p.getId();
                pDto.supplier = p.getSupplier();
                pDto.proposalNumber = p.getNotes();
                pDto.discountPercent = p.getDiscountPercent();
                pDto.prices = p.getPrices().stream().collect(
                        Collectors.toMap(
                                ProposalPrice::getItemId,
                                pr -> pr.getUnitPrice() != null ? pr.getUnitPrice() : BigDecimal.ZERO
                        )
                );
                return pDto;
            }).collect(Collectors.toList());

            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(backup);
    }
}
