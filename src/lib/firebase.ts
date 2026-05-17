import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCa_3tfTCcbr31k4mvvjx3zX1thKaXoZ6w",
  authDomain: "ntk-facefinder.firebaseapp.com",
  databaseURL: "https://ntk-facefinder-default-rtdb.firebaseio.com",
  projectId: "ntk-facefinder",
  storageBucket: "ntk-facefinder.firebasestorage.app",
  messagingSenderId: "51277787767",
  appId: "1:51277787767:web:71c397a083d46c1b388c72",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
export default app;
