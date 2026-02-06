import { Router } from 'express';
import inventoryController from '../controllers/inventoryController';
import { authenticate } from '../middleware/auth';
import { canManageInventory } from '../middleware/roleCheck';
import { handleValidation } from '../middleware/validation';
import { inventoryValidators } from '../utils/validators';

const router = Router();

router.use(authenticate);

// Inventory items
router.get('/', inventoryController.getItems);
router.get('/low-stock', inventoryController.getLowStockItems);
router.get('/value-summary', inventoryController.getValueSummary);
router.get('/:id', inventoryController.getItem);
router.get('/:id/transactions', inventoryController.getItemTransactions);

// Inventory management (manager+)
router.post('/', canManageInventory, inventoryValidators.createItem, handleValidation, inventoryController.createItem);
router.put('/:id', canManageInventory, inventoryController.updateItem);
router.post('/transaction', canManageInventory, inventoryValidators.stockTransaction, handleValidation, inventoryController.recordTransaction);

// Suppliers
router.get('/suppliers', inventoryController.getSuppliers);
router.post('/suppliers', canManageInventory, inventoryController.createSupplier);
router.put('/suppliers/:id', canManageInventory, inventoryController.updateSupplier);

export default router;
