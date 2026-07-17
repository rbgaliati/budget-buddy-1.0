package com.example.budgetbuddy.controller;

import com.example.budgetbuddy.model.Account;
import com.example.budgetbuddy.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
@CrossOrigin("*")
public class AccountController {
    private final AccountService accountService;
    
    @GetMapping
    public ResponseEntity<List<Account>> getAll() {
        return ResponseEntity.ok(accountService.getAllAccounts());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Account> getById(@PathVariable String id) {
        return accountService.getAccountById(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<Account> create(@RequestBody Account account) {
        return ResponseEntity.status(HttpStatus.CREATED).body(accountService.createAccount(account));
    }
    
    @PatchMapping("/{id}")
    public ResponseEntity<Account> update(@PathVariable String id, @RequestBody Account account) {
        return ResponseEntity.ok(accountService.updateAccount(id, account));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        accountService.deleteAccount(id);
        return ResponseEntity.noContent().build();
    }
}
