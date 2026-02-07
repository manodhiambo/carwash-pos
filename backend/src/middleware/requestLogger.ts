import { Request, Response, NextFunction } from 'express';

export const detailedRequestLogger = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' && req.path.includes('/payments')) {
    console.log('=== PAYMENT REQUEST DEBUG ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('===========================');
  }
  next();
};
