/************************************************************
 * START
 ************************************************************/
function initApp() {
  loadDataFromStorage();
  applyColorsToCSS();
  renderListSelect();
  updateCurrentList();
  renderTasks();
  updateProgressBar();
  initColorPickers();
  console.log("Impact Validation Check: Todo app initialized successfully.");
}
document.addEventListener("DOMContentLoaded", initApp);

function debounce(func, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

/************************************************************
 * DATA + LOCAL STORAGE // 
 ************************************************************/
// add store lists 

const STORAGE_KEY = "advancedTodoDataLuxCustom";
let todoData = {
  lists: { "Default": [] },
  selectedList: "Default",
  accentColor: "#C6A664",
  overdueColor: "#6A1B1B"
};

// Global sort order (default: creation)
let currentSortOrder = "creation";

// DOM Elements
const slideoutMenu = document.getElementById("slideoutMenu");
const headerHamburger = document.getElementById("headerHamburger");
const menuCloseBtn = document.getElementById("menuCloseBtn");
const menuNewListBtn = document.getElementById("menuNewListBtn");
const listSelectMenu = document.getElementById("listSelectMenu");
const sortOrderSelect = document.getElementById("sortOrderSelect");
const newListDialog = document.getElementById("newListDialog");
const newListForm = document.getElementById("newListForm");
const newListNameInput = document.getElementById("newListName");
const cancelListDialogBtn = document.getElementById("cancelListDialogBtn");
const accentColorPicker = document.getElementById("accentColorPicker");
const overdueColorPicker = document.getElementById("overdueColorPicker");
const addTaskForm = document.getElementById("addTaskForm");
const taskInput = document.getElementById("taskInput");
const dueDateInput = document.getElementById("dueDateInput");
const taskListEl = document.getElementById("taskList");
const sortAlphaBtn = document.getElementById("sortAlphaBtn");
const sortDueBtn = document.getElementById("sortDueBtn");
const progressBar = document.getElementById("progressBar");
const progressInfo = document.getElementById("progressInfo");
const deleteDialog = document.getElementById("deleteDialog");
const deleteMsg = document.getElementById("deleteMsg");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const searchInput = document.getElementById("searchInput");
let taskToDeleteIndex = null;

/************************************************************
 * List Dynamsika DOM Funktioner
 ************************************************************/
function renderListSelect() {
  listSelectMenu.innerHTML = "";
  // Get list names according to sort order
  let listNames = Object.keys(todoData.lists);
  if (currentSortOrder === "alphabetical") {
    listNames.sort((a, b) => a.localeCompare(b));
  }
  // Populate select with list names
  listNames.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    listSelectMenu.appendChild(opt);
  });
  // Append "Create New List" as the last option
  const newOpt = document.createElement("option");
  newOpt.value = "new";
  newOpt.textContent = "➕ Create New List";
  listSelectMenu.appendChild(newOpt);
  // Set current selection if possible
  listSelectMenu.value = todoData.selectedList;
}
function updateCurrentList() {
  if (listSelectMenu.value !== "new") {
    todoData.selectedList = listSelectMenu.value;
    renderTasks();
  }
}

/************************************************************
 * LOCAL STORAGE 
 ************************************************************/
function loadDataFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  try {
    if (data) {
      const parsed = JSON.parse(data);
      // Load tasks and colors; lists remain ephemeral
      todoData.lists[todoData.selectedList] = parsed.lists[todoData.selectedList] || [];
      todoData.accentColor = parsed.accentColor || todoData.accentColor;
      todoData.overdueColor = parsed.overdueColor || todoData.overdueColor;
    }
  } catch (error) {
    console.error("Error parsing stored data:", error);
  }
}
function saveDataToStorage() {
  const dataToSave = {
    lists: { [todoData.selectedList]: todoData.lists[todoData.selectedList] },
    accentColor: todoData.accentColor,
    overdueColor: todoData.overdueColor
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
}

/************************************************************
 * APPLY & PICK COLORS
 ************************************************************/
// gå igenom del 

function applyColorsToCSS() {
  document.documentElement.style.setProperty("--accentColor", todoData.accentColor);
  document.documentElement.style.setProperty("--overdueColor", todoData.overdueColor);
}
function initColorPickers() {
  accentColorPicker.value = todoData.accentColor;
  overdueColorPicker.value = todoData.overdueColor;
  accentColorPicker.addEventListener("input", () => {
    todoData.accentColor = accentColorPicker.value;
    saveDataToStorage();
    applyColorsToCSS();
    renderTasks();
  });
  overdueColorPicker.addEventListener("input", () => {
    todoData.overdueColor = overdueColorPicker.value;
    saveDataToStorage();
    applyColorsToCSS();
    renderTasks();
  });
}

/************************************************************
 * SLIDEOUT MENU
 ************************************************************/
headerHamburger.addEventListener("click", () => slideoutMenu.classList.add("open"));
menuCloseBtn.addEventListener("click", () => slideoutMenu.classList.remove("open"));
menuNewListBtn.addEventListener("click", () => {
  slideoutMenu.classList.remove("open");
  showDialog(newListDialog);
});

/************************************************************
 * NEW LIST (Ephemeral, not saved)
 ************************************************************/
newListForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const listName = newListNameInput.value.trim();
  if (!listName) return;
  if (!todoData.lists[listName]) {
    todoData.lists[listName] = [];
  }
  todoData.selectedList = listName;
  renderListSelect();
  renderTasks();
  closeDialogWithAnimation(newListDialog);
  newListNameInput.value = "";
});
cancelListDialogBtn.addEventListener("click", () => closeDialogWithAnimation(newListDialog));

listSelectMenu.addEventListener("change", () => {
  if (listSelectMenu.value === "new") {
    showDialog(newListDialog);
  } else {
    updateCurrentList();
  }
});
sortOrderSelect.addEventListener("change", () => {
  currentSortOrder = sortOrderSelect.value;
  renderListSelect();
});

/************************************************************
 * TASKS & MODULAR UI RENDERING
 ************************************************************/
addTaskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const textVal = taskInput.value.trim();
  const dueVal = dueDateInput.value || null;
  if (!textVal) return;
  const newTask = { text: textVal, completed: false, dueDate: dueVal, editing: false, subTasks: [] };
  todoData.lists[todoData.selectedList].push(newTask);
  saveDataToStorage();
  taskInput.value = "";
  dueDateInput.value = "";
  renderTasks();
});
function renderTasks() {
  const tasks = todoData.lists[todoData.selectedList] || [];
  const filterText = searchInput.value.trim().toLowerCase();
  taskListEl.innerHTML = "";
  tasks
    .map((task, index) => ({ ...task, index }))
    .filter(task => {
      if (!filterText) return true;
      const inText = task.text.toLowerCase().includes(filterText);
      const inSubs = task.subTasks.some(st => st.text.toLowerCase().includes(filterText));
      return inText || inSubs;
    })
    .forEach(taskObj => {
      const { text, completed, dueDate, editing, subTasks, index } = taskObj;
      const li = document.createElement("li");
      li.classList.add("task-item");
      li.draggable = true;
      li.addEventListener("dragstart", (e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index);
        li.classList.add("dragging");
      });
      li.addEventListener("dragover", (e) => {
        e.preventDefault();
        li.classList.add("drag-over");
        e.dataTransfer.dropEffect = "move";
      });
      li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
      li.addEventListener("drop", (e) => {
        e.stopPropagation();
        li.classList.remove("drag-over");
        const draggedIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
        if (draggedIndex === index) return;
        const tasks = todoData.lists[todoData.selectedList];
        const [movedTask] = tasks.splice(draggedIndex, 1);
        tasks.splice(index, 0, movedTask);
        saveDataToStorage();
        renderTasks();
      });
      li.addEventListener("dragend", () => {
        li.classList.remove("dragging");
        document.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
      });
      if (editing) {
        li.classList.add("edit-mode");
        const editContainer = document.createElement("div");
        editContainer.classList.add("edit-container");
        const editInput = document.createElement("input");
        editInput.type = "text";
        editInput.value = text;
        editContainer.appendChild(editInput);
        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save";
        saveBtn.addEventListener("click", () => saveEditTask(index, editInput.value));
        editContainer.appendChild(saveBtn);
        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.addEventListener("click", () => cancelEditTask(index));
        editContainer.appendChild(cancelBtn);
        li.appendChild(editContainer);
      } else {
        const taskHeader = document.createElement("div");
        taskHeader.classList.add("task-header");
        const dragHandle = document.createElement("span");
        dragHandle.classList.add("drag-handle");
        dragHandle.textContent = "⋮⋮";
        const taskInfo = document.createElement("div");
        taskInfo.classList.add("task-info");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = completed;
        checkbox.addEventListener("change", () => toggleTaskCompleted(index, checkbox.checked));
        taskInfo.appendChild(checkbox);
        const textSpan = document.createElement("span");
        textSpan.classList.add("task-text");
        if (completed) textSpan.classList.add("completed");
        textSpan.textContent = text;
        taskInfo.appendChild(textSpan);
        if (dueDate) {
          const dueSpan = document.createElement("span");
          dueSpan.classList.add("due-date-badge");
          const daysLeft = calculateDaysLeft(dueDate);
          dueSpan.textContent = daysLeft < 0 ? `Overdue by ${-daysLeft}d` : `${daysLeft}d left`;
          if (daysLeft < 0) dueSpan.classList.add("overdue");
          taskInfo.appendChild(dueSpan);
        }
        const actionsDiv = document.createElement("div");
        actionsDiv.classList.add("task-actions");
        const subtaskBtn = document.createElement("button");
        subtaskBtn.textContent = "Subtasks";
        subtaskBtn.addEventListener("click", () => toggleSubtasksVisibility(li));
        actionsDiv.appendChild(subtaskBtn);
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => enterEditMode(index));
        actionsDiv.appendChild(editBtn);
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => showDeleteDialog(index));
        actionsDiv.appendChild(delBtn);
        taskHeader.appendChild(dragHandle);
        taskHeader.appendChild(taskInfo);
        taskHeader.appendChild(actionsDiv);
        li.appendChild(taskHeader);

        // Improved Subtasks Container (Smooth Transition)
        const subtasksContainer = document.createElement("div");
        subtasksContainer.classList.add("subtasks-container");
        subTasks.forEach((st, stIndex) => {
          const subtaskItem = document.createElement("div");
          subtaskItem.classList.add("subtask-item");
          const stCheckbox = document.createElement("input");
          stCheckbox.type = "checkbox";
          stCheckbox.checked = st.completed;
          stCheckbox.addEventListener("change", () => toggleSubtaskCompleted(index, stIndex, stCheckbox.checked));
          subtaskItem.appendChild(stCheckbox);
          const stTextSpan = document.createElement("span");
          stTextSpan.textContent = st.text;
          stTextSpan.classList.add("subtask-text");
          if (st.completed) stTextSpan.classList.add("completed");
          subtaskItem.appendChild(stTextSpan);
          const removeStBtn = document.createElement("button");
          removeStBtn.textContent = "×";
          removeStBtn.classList.add("remove-subtask-btn");
          removeStBtn.addEventListener("click", () => removeSubtask(index, stIndex));
          subtaskItem.appendChild(removeStBtn);
          subtasksContainer.appendChild(subtaskItem);
        });
        const addSubtaskForm = document.createElement("div");
        addSubtaskForm.classList.add("subtask-item");
        const addSubtaskInput = document.createElement("input");
        addSubtaskInput.type = "text";
        addSubtaskInput.placeholder = "Add subtask...";
        addSubtaskInput.addEventListener("keydown", (evt) => {
          if (evt.key === "Enter") {
            evt.preventDefault();
            const stText = addSubtaskInput.value.trim();
            if (!stText) return;
            addNewSubtask(index, stText);
            addSubtaskInput.value = "";
          }
        });
        addSubtaskForm.appendChild(addSubtaskInput);
        const addSubtaskBtn = document.createElement("button");
        addSubtaskBtn.textContent = "+";
        addSubtaskBtn.classList.add("subtask-add-btn");
        addSubtaskBtn.addEventListener("click", () => {
          const stText = addSubtaskInput.value.trim();
          if (!stText) return;
          addNewSubtask(index, stText);
          addSubtaskInput.value = "";
        });
        addSubtaskForm.appendChild(addSubtaskBtn);
        subtasksContainer.appendChild(addSubtaskForm);
        li.appendChild(subtasksContainer);
      }
      taskListEl.appendChild(li);
    });
}
function toggleTaskCompleted(index, isCompleted) {
  todoData.lists[todoData.selectedList][index].completed = isCompleted;
  saveDataToStorage();
  renderTasks();
}
function enterEditMode(index) {
  todoData.lists[todoData.selectedList][index].editing = true;
  renderTasks();
}
function saveEditTask(index, newText) {
  newText = newText.trim();
  if (!newText) return;
  todoData.lists[todoData.selectedList][index].text = newText;
  todoData.lists[todoData.selectedList][index].editing = false;
  saveDataToStorage();
  renderTasks();
}
function cancelEditTask(index) {
  todoData.lists[todoData.selectedList][index].editing = false;
  renderTasks();
}
function addNewSubtask(taskIndex, subtaskText) {
  todoData.lists[todoData.selectedList][taskIndex].subTasks.push({ text: subtaskText, completed: false });
  saveDataToStorage();
  renderTasks();
}
function toggleSubtaskCompleted(taskIndex, subIndex, isCompleted) {
  todoData.lists[todoData.selectedList][taskIndex].subTasks[subIndex].completed = isCompleted;
  saveDataToStorage();
  renderTasks();
}
function removeSubtask(taskIndex, subIndex) {
  todoData.lists[todoData.selectedList][taskIndex].subTasks.splice(subIndex, 1);
  saveDataToStorage();
  renderTasks();
}
function toggleSubtasksVisibility(taskItemEl) {
  const subtasksContainer = taskItemEl.querySelector(".subtasks-container");
  if (!subtasksContainer) return;
  subtasksContainer.classList.toggle("open");
}

/************************************************************
 * DELETE TASK
 ************************************************************/
function showDeleteDialog(index) {
  taskToDeleteIndex = index;
  deleteMsg.textContent = "Are you sure you want to delete this task?";
  showDialog(deleteDialog);
}
cancelDeleteBtn.addEventListener("click", () => {
  closeDialogWithAnimation(deleteDialog);
  taskToDeleteIndex = null;
});
confirmDeleteBtn.addEventListener("click", () => {
  if (taskToDeleteIndex !== null) {
    todoData.lists[todoData.selectedList].splice(taskToDeleteIndex, 1);
    saveDataToStorage();
    renderTasks();
  }
  taskToDeleteIndex = null;
  closeDialogWithAnimation(deleteDialog);
});

/************************************************************
 * SORT
 ************************************************************/
sortAlphaBtn.addEventListener("click", () => {
  const tasks = todoData.lists[todoData.selectedList];
  tasks.sort((a, b) => a.text.localeCompare(b.text));
  saveDataToStorage();
  renderTasks();
});
sortDueBtn.addEventListener("click", () => {
  const tasks = todoData.lists[todoData.selectedList];
  tasks.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  saveDataToStorage();
  renderTasks();
});

/************************************************************
 * PROGRESS & DATE HELPER
 ************************************************************/
function updateProgressBar() {
  const tasks = todoData.lists[todoData.selectedList] || [];
  let completedCount = 0;
  tasks.forEach(t => {
    if (t.completed && t.subTasks.every(st => st.completed)) { completedCount++; }
  });
  const total = tasks.length;
  progressInfo.textContent = `${completedCount} / ${total} tasks completed`;
  const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  progressBar.style.width = pct + "%";
}
function calculateDaysLeft(dueDateStr) {
  const now = new Date();
  const dueDate = new Date(dueDateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = dueDate.getTime() - now.getTime();
  return Math.floor(diff / msPerDay);
}

/************************************************************
 * DIALOGS
 ************************************************************/
function showDialog(dialogEl) { dialogEl.showModal(); }
function closeDialogWithAnimation(dialogEl) {
  dialogEl.classList.add("closing");
  setTimeout(() => {
    dialogEl.classList.remove("closing");
    dialogEl.close();
  }, 300);
}

/************************************************************
 * SEARCH (Debounced)
 ************************************************************/
searchInput.addEventListener("input", debounce(renderTasks, 300));


