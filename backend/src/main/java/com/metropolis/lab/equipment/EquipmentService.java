package com.metropolis.lab.equipment;

import com.metropolis.lab.common.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class EquipmentService {
  private final EquipmentRepository repository;
  public EquipmentService(EquipmentRepository repository){this.repository=repository;}
  public List<Equipment> list(){return repository.findAll();}
  public Equipment get(Long id){return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Equipment not found: " + id));}
  public Equipment create(Equipment equipment){return repository.save(equipment);}
  public Equipment update(Long id, Equipment input){
    Equipment current=get(id); current.setName(input.getName()); current.setCategory(input.getCategory()); current.setAssetTag(input.getAssetTag());
    current.setStatus(input.getStatus()); current.setLocation(input.getLocation()); current.setDescription(input.getDescription()); return repository.save(current);
  }
  public void delete(Long id){repository.delete(get(id));}
}
