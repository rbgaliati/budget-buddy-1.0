package com.example.budgetbuddy.service;

import com.example.budgetbuddy.model.Account;
import com.example.budgetbuddy.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AccountService {
    private final AccountRepository accountRepository;
    
    public List<Account> getAllAccounts() {
        return accountRepository.findAll();
    }
    
    public Optional<Account> getAccountById(String id) {
        return accountRepository.findById(id);
    }
    
    public Account createAccount(Account account) {
        return accountRepository.save(account);
    }
    
    public Account updateAccount(String id, Account account) {
        return accountRepository.findById(id).map(existing -> {
            existing.setName(account.getName());
            existing.setType(account.getType());
            return accountRepository.save(existing);
        }).orElseThrow(() -> new RuntimeException("Account not found"));
    }
    
    public void deleteAccount(String id) {
        accountRepository.deleteById(id);
    }
}
