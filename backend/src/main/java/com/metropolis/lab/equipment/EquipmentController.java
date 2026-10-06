package com.metropolis.lab.equipment;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {
  private final EquipmentService service;
  public EquipmentController(EquipmentService service){this.service=service;}
  @GetMapping public List<Equipment> list(){return service.list();}
  @GetMapping("/{id}") public Equipment get(@PathVariable Long id){return service.get(id);}
  @PostMapping @ResponseStatus(HttpStatus.CREATED) public Equipment create(@Valid @RequestBody Equipment equipment){return service.create(equipment);}
  @PutMapping("/{id}") public Equipment update(@PathVariable Long id, @Valid @RequestBody Equipment equipment){return service.update(id, equipment);}
  @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
