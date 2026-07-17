package com.example.budgetbuddy.controller;

import com.example.budgetbuddy.model.Stage;
import com.example.budgetbuddy.service.StageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/stages")
@RequiredArgsConstructor
@CrossOrigin("*")
public class StageController {
    private final StageService stageService;
    
    @GetMapping
    public ResponseEntity<List<Stage>> getAll() {
        return ResponseEntity.ok(stageService.getAllStages());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Stage> getById(@PathVariable String id) {
        return stageService.getStageById(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<Stage> create(@RequestBody Stage stage) {
        return ResponseEntity.status(HttpStatus.CREATED).body(stageService.createStage(stage));
    }
    
    @PatchMapping("/{id}")
    public ResponseEntity<Stage> update(@PathVariable String id, @RequestBody Stage stage) {
        return ResponseEntity.ok(stageService.updateStage(id, stage));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        stageService.deleteStage(id);
        return ResponseEntity.noContent().build();
    }
}
