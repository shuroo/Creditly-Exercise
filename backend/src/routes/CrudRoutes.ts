import { Router } from "express";
import { CrudService } from "../services/crudService.js";
import { createCrudController } from "../controllers/createCrudController.js";

export function createCrudRoutes<T extends { id: string }>(
  service: CrudService<T>
): Router {
  const router = Router();
  const controller = createCrudController(service);

  router.get("/", controller.getAll);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.delete);

  return router;
}