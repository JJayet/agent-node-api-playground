const initialTodos = [
  { id: 1, title: 'Read the API documentation', completed: true },
  { id: 2, title: 'Pick a GitHub issue', completed: false },
  { id: 3, title: 'Open a pull request', completed: false }
];

export function createTodoStore(seed = initialTodos) {
  let todos = structuredClone(seed);

  return {
    list() {
      return structuredClone(todos);
    },

    get(id) {
      const todo = todos.find((todo) => todo.id === id);
      return todo ? structuredClone(todo) : undefined;
    },

    create(title) {
      // Intentionally naive: deleting a todo can make this ID collide.
      const todo = {
        id: todos.length + 1,
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
