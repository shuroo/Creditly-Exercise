import type { Request, Response } from "express";
import { CrudService } from "../services/CrudService.js";

export function createCrudController<T extends { id: string }>(
  service: CrudService<T>
) {
  return {
    getAll: (req: Request, res: Response) => {
      res.json(service.findAll());
    },

    getById: (req: Request, res: Response) => {
      const id = req.params.id as string;
      try {
        res.json(service.findById(id));
      } catch (error) {
        res.status(404).json({ message: "Not found" });
      }
    },

    create: (req: Request, res: Response) => {
      const created = service.create(req.body);
      res.status(201).json(created);
    },

    update: (req: Request, res: Response) => {
      const id = req.params.id as string;
      try {
        const updated = service.update(id, req.body);
        res.json(updated);
      } catch (error) {
        res.status(404).json({ message: "Not found" });
      }
    },

    delete: (req: Request, res: Response) => {
      const id = req.params.id as string;
      try {
        service.delete(id);
        res.status(204).send();
      } catch (error) {
        res.status(404).json({ message: "Not found" });
      }
    }
  };
}