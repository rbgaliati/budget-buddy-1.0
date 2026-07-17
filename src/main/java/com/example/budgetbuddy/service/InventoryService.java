package com.example.budgetbuddy.service;

import com.example.budgetbuddy.model.InventoryItem;
import com.example.budgetbuddy.repository.InventoryItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InventoryService {
    private final InventoryItemRepository inventoryRepository;
    
    public List<InventoryItem> getAllItems() {
        return inventoryRepository.findAll();
    }
    
    public Optional<InventoryItem> getItemById(String id) {
        return inventoryRepository.findById(id);
    }
    
    public InventoryItem createItem(InventoryItem item) {
        return inventoryRepository.save(item);
    }
    
    public InventoryItem updateItem(String id, InventoryItem item) {
        return inventoryRepository.findById(id).map(existing -> {
            existing.setDescription(item.getDescription());
            existing.setQuantity(item.getQuantity());
            existing.setUnit(item.getUnit());
            existing.setLocation(item.getLocation());
            existing.setLinkedExpenseId(item.getLinkedExpenseId());
            return inventoryRepository.save(existing);
        }).orElseThrow(() -> new RuntimeException("Inventory item not found"));
    }
    
    public void deleteItem(String id) {
        inventoryRepository.deleteById(id);
    }
}
