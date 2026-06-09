import type { Request, Response } from "express";
import { CrudService } from "../services/crudService.js";

export function createCrudController<T extends { id: string }>(
  service: CrudService<T>
) {
  return {
    getAll: async (req: Request, res: Response) => {
      res.json(await service.findAll());
    },

    getById: async (req: Request, res: Response) => {
      const id = req.params.id as string;
      try {
        res.json(await service.findById(id));
      } catch (error) {
        res.status(404).json({ message: "Not found" });
      }
    },

    create: async (req: Request, res: Response) => {
      const created = await service.create(req.body);
      res.status(201).json(created);
    },

    update: async (req: Request, res: Response) => {
      const id = req.params.id as string;
      try {
        const updated = await service.update(id, req.body);
        res.json(updated);
      } catch (error) {
        res.status(404).json({ message: "Not found" });
      }
    },

    delete: async (req: Request, res: Response) => {
      const id = req.params.id as string;
      try {
        await service.delete(id);
        res.status(204).send();
      } catch (error) {
        res.status(404).json({ message: "Not found" });
      }
    }
  };
}
