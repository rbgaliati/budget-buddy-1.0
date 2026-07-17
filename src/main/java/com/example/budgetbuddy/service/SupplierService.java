package com.example.budgetbuddy.service;

import com.example.budgetbuddy.model.Supplier;
import com.example.budgetbuddy.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SupplierService {
    private final SupplierRepository supplierRepository;
    
    public List<Supplier> getAllSuppliers() {
        return supplierRepository.findAll();
    }
    
    public Optional<Supplier> getSupplierById(String id) {
        return supplierRepository.findById(id);
    }
    
    public Supplier createSupplier(Supplier supplier) {
        return supplierRepository.save(supplier);
    }
    
    public Supplier updateSupplier(String id, Supplier supplier) {
        return supplierRepository.findById(id).map(existing -> {
            existing.setName(supplier.getName());
            existing.setDocument(supplier.getDocument());
            existing.setContact(supplier.getContact());
            return supplierRepository.save(existing);
        }).orElseThrow(() -> new RuntimeException("Supplier not found"));
    }
    
    public void deleteSupplier(String id) {
        supplierRepository.deleteById(id);
    }
}
