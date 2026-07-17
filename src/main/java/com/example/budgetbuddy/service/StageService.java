package com.example.budgetbuddy.service;

import com.example.budgetbuddy.model.Stage;
import com.example.budgetbuddy.repository.StageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StageService {
    private final StageRepository stageRepository;
    
    public List<Stage> getAllStages() {
        return stageRepository.findAll();
    }
    
    public Optional<Stage> getStageById(String id) {
        return stageRepository.findById(id);
    }
    
    public Stage createStage(Stage stage) {
        return stageRepository.save(stage);
    }
    
    public Stage updateStage(String id, Stage stage) {
        return stageRepository.findById(id).map(existing -> {
            existing.setName(stage.getName());
            existing.setPlanned(stage.getPlanned());
            return stageRepository.save(existing);
        }).orElseThrow(() -> new RuntimeException("Stage not found"));
    }
    
    public void deleteStage(String id) {
        stageRepository.deleteById(id);
    }
}
