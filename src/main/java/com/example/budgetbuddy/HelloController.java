package com.example.budgetbuddy;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.util.List;

@RestController
public class HelloController {

    @GetMapping("/")
    public Map<String, Object> welcome() {
        return Map.of(
            "status", "Budget Buddy API está no ar!",
            "version", "2.0.0",
            "java_version", System.getProperty("java.version"),
            "endpoints", List.of(
                "GET /api/accounts - Listar contas",
                "GET /api/suppliers - Listar fornecedores",
                "GET /api/stages - Listar etapas da obra",
                "GET /api/expenses - Listar despesas",
                "GET /api/quotations - Listar cotações",
                "GET /api/inventory - Listar inventário",
                "POST /api/* - Criar novo recurso",
                "PATCH /api/*/:id - Atualizar recurso",
                "DELETE /api/*/:id - Deletar recurso",
                "GET /h2-console - Console H2 (desenvolvimento)"
            )
        );
    }
}
