const initialTodos = [
  { id: 1, title: 'Read the API documentation', completed: true },
  { id: 2, title: 'Pick a GitHub issue', completed: false },
  { id: 3, title: 'Open a pull request', completed: false }
];

export function createTodoStore(seed = initialTodos) {
  let todos = structuredClone(seed);
  let nextId = todos.reduce((max, todo) => Math.max(max, todo.id), 0) + 1;

  return {
    list() {
      return structuredClone(todos);
    },

    create(title) {
      const todo = {
        id: nextId++,
        title: title.trim(),
        completed: false
      };

      todos.push(todo);
      return structuredClone(todo);
    },

    remove(id) {
      const previousLength = todos.length;
      todos = todos.filter((todo) => todo.id !== id);
      return todos.length < previousLength;
    }
  };
}
