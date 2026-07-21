import { createApp } from './app.js';
import { createTodoStore } from './store.js';

const port = Number(process.env.PORT ?? 3000);
const app = createApp(createTodoStore());

app.listen(port, () => {
  console.log(`Todo API listening on http://localhost:${port}`);
});
