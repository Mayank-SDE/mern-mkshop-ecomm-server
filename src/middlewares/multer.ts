import multer from 'multer';
import { v4 as uuid } from 'uuid';

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, 'uploads');
  },
  filename(req, file, callback) {
    const id = uuid();
    const extensionName = file.originalname.split('.').pop();
    const fileName = `${id}.${extensionName}`;
    callback(null, fileName);
  },
});

export const singleUpload = multer({ storage }).single('photo');
