import { Router } from 'express';
import inventoryController from '../controllers/inventoryController';
import { authenticate } from '../middleware/auth';
import { canManageInventory } from '../middleware/roleCheck';
import { handleValidation } from '../middleware/validation';
import { inventoryValidators } from '../utils/validators';

const router = Router();

router.use(authenticate);

// CRITICAL: Suppliers routes MUST come BEFORE /:id routes to avoid route conflicts
router.get('/suppliers', inventoryController.getSuppliers);
router.post('/suppliers', canManageInventory, handleValidation, inventoryController.createSupplier);
router.put('/suppliers/:id', canManageInventory, handleValidation, inventoryController.updateSupplier);

// Specific inventory routes (before parameterized routes)
router.get('/low-stock', inventoryController.getLowStockItems);
router.get('/value-summary', inventoryController.getValueSummary);
router.post('/transaction', canManageInventory, inventoryValidators.stockTransaction, handleValidation, inventoryController.recordTransaction);

// General inventory item routes
router.get('/', inventoryController.getItems);
router.post('/', canManageInventory, inventoryValidators.createItem, handleValidation, inventoryController.createItem);


// Sales routes
router.post('/sale', canManageInventory, inventoryValidators.saleTransaction, handleValidation, inventoryController.recordSale);
router.get('/sales-report', inventoryController.getSalesReport);

// Parameterized routes (MUST BE LAST to avoid conflicts)
router.get('/:id', inventoryController.getItem);
router.get('/:id/transactions', inventoryController.getItemTransactions);
router.put('/:id', canManageInventory, inventoryController.updateItem);

export default router;
