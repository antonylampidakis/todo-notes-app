import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { CSS } from "@dnd-kit/utilities";

import "./App.css";

type ActiveTab =
  | "calendar"
  | "todos"
  | "notes"
  | "settings";
type TodoFilter = "all" | "active" | "completed";
type Theme = "light" | "dark";

type TodoPriority = "low" | "medium" | "high";

type TodoCategory =
  | "personal"
  | "studies"
  | "work"
  | "other";

type PriorityFilter =
  | "all"
  | TodoPriority;

type CategoryFilter =
  | "all"
  | TodoCategory;

type DueDateFilter =
  | "all"
  | "overdue"
  | "today"
  | "upcoming"
  | "no-date";

type CalendarDragItemType = "todo" | "event";

interface CalendarDragData {
  type: CalendarDragItemType;
  itemId: string;
  title: string;
  sourceDate: string;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  dueDate?: string;
  priority?: TodoPriority;
  category?: TodoCategory;
}

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  createdAt: number;
}

interface AppBackup {
  version: 1;
  exportedAt: string;
  todos: Todo[];
  notes: Note[];
  calendarEvents: CalendarEvent[];
  theme: Theme;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;

  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

interface DraggableCalendarItemProps {
  id: string;
  data: CalendarDragData;
  className: string;
  children: ReactNode;
}

function DraggableCalendarItem({
  id,
  data,
  className,
  children,
}: DraggableCalendarItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    data,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
  };

  return (
    <span
      ref={setNodeRef}
      style={style}
      className={className}
      {...listeners}
      {...attributes}
    >
      {children}
    </span>
  );
}

interface DroppableCalendarDayProps {
  dateString: string;
  className: string;
  children: ReactNode;
  onClick: () => void;
}

function DroppableCalendarDay({
  dateString,
  className,
  children,
  onClick,
}: DroppableCalendarDayProps) {
  const {
    isOver,
    setNodeRef,
  } = useDroppable({
    id: `day-${dateString}`,
    data: {
      date: dateString,
    },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={[
        className,
        isOver ? "drag-over" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function createId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const savedValue = localStorage.getItem(key);

    if (!savedValue) {
      return fallback;
    }

    return JSON.parse(savedValue) as T;
  } catch {
    return fallback;
  }
}

function getTodayDateString(): string {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateForStorage(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCalendarDays(currentMonth: Date): Date[] {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const firstDayIndex =
    firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;

  const lastDayIndex =
    lastDayOfMonth.getDay() === 0 ? 6 : lastDayOfMonth.getDay() - 1;

  const calendarStart = new Date(year, month, 1 - firstDayIndex);
  const calendarEnd = new Date(
    year,
    month,
    lastDayOfMonth.getDate() + (6 - lastDayIndex)
  );

  const days: Date[] = [];
  const currentDate = new Date(calendarStart);

  while (currentDate <= calendarEnd) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
}

function getPriorityLabel(priority?: TodoPriority): string {
  switch (priority) {
    case "high":
      return "Υψηλή";

    case "medium":
      return "Μεσαία";

    case "low":
      return "Χαμηλή";

    default:
      return "Χωρίς προτεραιότητα";
  }
}

function getCategoryLabel(category?: TodoCategory): string {
  switch (category) {
    case "personal":
      return "Προσωπικά";

    case "studies":
      return "Σχολή";

    case "work":
      return "Εργασία";

    case "other":
      return "Άλλο";

    default:
      return "Χωρίς κατηγορία";
  }
}

function getStartOfToday(): Date {
  const today = new Date();

  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
}

function parseStorageDate(dateString: string): Date {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

function getDaysDifference(dateString: string): number {
  const today = getStartOfToday();
  const targetDate = parseStorageDate(dateString);

  const differenceInMilliseconds =
    targetDate.getTime() - today.getTime();

  return Math.round(
    differenceInMilliseconds / (1000 * 60 * 60 * 24)
  );
}

function getDueDateStatus(
  dueDate?: string,
  completed?: boolean
):
  | "none"
  | "completed"
  | "overdue"
  | "today"
  | "tomorrow"
  | "upcoming" {
  if (!dueDate) {
    return "none";
  }

  if (completed) {
    return "completed";
  }

  const daysDifference = getDaysDifference(dueDate);

  if (daysDifference < 0) {
    return "overdue";
  }

  if (daysDifference === 0) {
    return "today";
  }

  if (daysDifference === 1) {
    return "tomorrow";
  }

  return "upcoming";
}

function getDueDateLabel(
  dueDate?: string,
  completed?: boolean
): string {
  if (!dueDate) {
    return "Χωρίς προθεσμία";
  }

  if (completed) {
    return "Ολοκληρωμένη";
  }

  const daysDifference = getDaysDifference(dueDate);

  if (daysDifference < 0) {
    const overdueDays = Math.abs(daysDifference);

    return overdueDays === 1
      ? "Ληξιπρόθεσμη κατά 1 ημέρα"
      : `Ληξιπρόθεσμη κατά ${overdueDays} ημέρες`;
  }

  if (daysDifference === 0) {
    return "Λήγει σήμερα";
  }

  if (daysDifference === 1) {
    return "Λήγει αύριο";
  }

  return `Λήγει σε ${daysDifference} ημέρες`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidTodo(value: unknown): value is Todo {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    typeof value.completed === "boolean" &&
    typeof value.createdAt === "number" &&
    (value.dueDate === undefined ||
      typeof value.dueDate === "string") &&
    (value.priority === undefined ||
      value.priority === "low" ||
      value.priority === "medium" ||
      value.priority === "high") &&
    (value.category === undefined ||
      value.category === "personal" ||
      value.category === "studies" ||
      value.category === "work" ||
      value.category === "other")
  );
}

function isValidNote(value: unknown): value is Note {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.content === "string" &&
    typeof value.updatedAt === "number"
  );
}

function isValidCalendarEvent(
  value: unknown
): value is CalendarEvent {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.date === "string" &&
    typeof value.time === "string" &&
    typeof value.createdAt === "number"
  );
}

function isValidBackup(value: unknown): value is AppBackup {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.version === 1 &&
    typeof value.exportedAt === "string" &&
    Array.isArray(value.todos) &&
    value.todos.every(isValidTodo) &&
    Array.isArray(value.notes) &&
    value.notes.every(isValidNote) &&
    Array.isArray(value.calendarEvents) &&
    value.calendarEvents.every(isValidCalendarEvent) &&
    (value.theme === "light" || value.theme === "dark")
  );
}
function formatCalendarDate(
  dateString: string
): string {
  return new Intl.DateTimeFormat("el-GR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(
    new Date(`${dateString}T12:00:00`)
  );
}

function App() {
  const [activeTab, setActiveTab] =
  useState<ActiveTab>("calendar");

  const [todos, setTodos] = useState<Todo[]>(() =>
    loadFromStorage<Todo[]>("todo-notes-todos", [])
  );

  const [notes, setNotes] = useState<Note[]>(() =>
    loadFromStorage<Note[]>("todo-notes-notes", [])
  );
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(
  () => loadFromStorage<CalendarEvent[]>("todo-notes-calendar-events", [])
);

  const [theme, setTheme] = useState<Theme>(() =>
    loadFromStorage<Theme>("todo-notes-theme", "light")
  );

  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoDueDate, setNewTodoDueDate] = useState("");
  const [newTodoPriority, setNewTodoPriority] =
  useState<TodoPriority>("medium");

  const [newTodoCategory, setNewTodoCategory] =
  useState<TodoCategory>("personal");
  const [todoFilter, setTodoFilter] = useState<TodoFilter>("all");
  const [priorityFilter, setPriorityFilter] =
  useState<PriorityFilter>("all");

  const [categoryFilter, setCategoryFilter] =
  useState<CategoryFilter>("all");

  const [dueDateFilter, setDueDateFilter] =
  useState<DueDateFilter>("all");

  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState("");

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [notesSearch, setNotesSearch] = useState("");

  const [isOnline, setIsOnline] = useState(
  navigator.onLine
);

const [activeDragItem, setActiveDragItem] =
  useState<CalendarDragData | null>(null);

const [dragMessage, setDragMessage] =
  useState<string | null>(null);

const [installPrompt, setInstallPrompt] =
  useState<BeforeInstallPromptEvent | null>(null);

const [isInstalled, setIsInstalled] = useState(
  window.matchMedia("(display-mode: standalone)").matches
);

const dragSensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6,
    },
  }),

  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 8,
    },
  })
);

  const [dataMessage, setDataMessage] = useState<{
  type: "success" | "error";
  text: string;
} | null>(null);

  useEffect(() => {
    localStorage.setItem("todo-notes-todos", JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem("todo-notes-notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem("todo-notes-theme", JSON.stringify(theme));
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
  function handleOnline(): void {
    setIsOnline(true);
  }

  function handleOffline(): void {
    setIsOnline(false);
  }

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}, []);

useEffect(() => {
  function handleBeforeInstallPrompt(
    event: Event
  ): void {
    event.preventDefault();

    setInstallPrompt(
      event as BeforeInstallPromptEvent
    );
  }

  function handleAppInstalled(): void {
    setInstallPrompt(null);
    setIsInstalled(true);

    setDataMessage({
      type: "success",
      text: "Η εφαρμογή εγκαταστάθηκε επιτυχώς.",
    });
  }

 

  window.addEventListener(
    "beforeinstallprompt",
    handleBeforeInstallPrompt
  );

  window.addEventListener(
    "appinstalled",
    handleAppInstalled
  );

  return () => {
    window.removeEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.removeEventListener(
      "appinstalled",
      handleAppInstalled
    );
  };
}, []);

  useEffect(() => {
  localStorage.setItem(
    "todo-notes-calendar-events",
    JSON.stringify(calendarEvents)
  );
}, [calendarEvents]);

  const completedTodosCount = todos.filter(
    (todo) => todo.completed
  ).length;

  const activeTodosCount = todos.length - completedTodosCount;

  const overdueTodosCount = todos.filter(
  (todo) =>
    !todo.completed &&
    todo.dueDate &&
    getDaysDifference(todo.dueDate) < 0
).length;

const todayTodosCount = todos.filter(
  (todo) =>
    !todo.completed &&
    todo.dueDate &&
    getDaysDifference(todo.dueDate) === 0
).length;

const upcomingTodosCount = todos.filter(
  (todo) =>
    !todo.completed &&
    todo.dueDate &&
    getDaysDifference(todo.dueDate) > 0
).length;

function handleCalendarDragStart(
  event: DragStartEvent
): void {
  const dragData =
    event.active.data.current as
      | CalendarDragData
      | undefined;

  if (!dragData) {
    return;
  }

  setActiveDragItem(dragData);
  setDragMessage(null);
}

function handleCalendarDragEnd(
  event: DragEndEvent
): void {
  const { active, over } = event;

  setActiveDragItem(null);

  if (!over) {
    return;
  }

  const dragData =
    active.data.current as
      | CalendarDragData
      | undefined;

  const targetDate =
    over.data.current?.date as
      | string
      | undefined;

  if (!dragData || !targetDate) {
    return;
  }

  if (dragData.sourceDate === targetDate) {
    return;
  }

  if (dragData.type === "todo") {
    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === dragData.itemId
          ? {
              ...todo,
              dueDate: targetDate,
            }
          : todo
      )
    );

    setDragMessage(
      `Η εργασία «${dragData.title}» μεταφέρθηκε στις ${formatCalendarDate(
        targetDate
      )}.`
    );
  }

  if (dragData.type === "event") {
    setCalendarEvents((currentEvents) =>
      currentEvents.map((calendarEvent) =>
        calendarEvent.id === dragData.itemId
          ? {
              ...calendarEvent,
              date: targetDate,
            }
          : calendarEvent
      )
    );

    if (editingEventId === dragData.itemId) {
      setEventDate(targetDate);
    }

    setDragMessage(
      `Το συμβάν «${dragData.title}» μεταφέρθηκε στις ${formatCalendarDate(
        targetDate
      )}.`
    );
  }

  setSelectedDate(targetDate);
}

function handleCalendarDragCancel(): void {
  setActiveDragItem(null);
}

async function installApplication(): Promise<void> {
  if (!installPrompt) {
    setDataMessage({
      type: "error",
      text: "Η εγκατάσταση δεν είναι διαθέσιμη σε αυτόν τον browser ή η εφαρμογή είναι ήδη εγκατεστημένη.",
    });

    return;
  }

  await installPrompt.prompt();

  const choiceResult =
    await installPrompt.userChoice;

  if (choiceResult.outcome === "accepted") {
    setInstallPrompt(null);
  } else {
    setDataMessage({
      type: "error",
      text: "Η εγκατάσταση ακυρώθηκε.",
    });
  }
}

function exportBackup(): void {
  const backup: AppBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    todos,
    notes,
    calendarEvents,
    theme,
  };

  const backupJson = JSON.stringify(backup, null, 2);
  const blob = new Blob([backupJson], {
    type: "application/json",
  });

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const dateLabel = getTodayDateString();

  link.href = downloadUrl;
  link.download = `tasks-notes-backup-${dateLabel}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(downloadUrl);

  setDataMessage({
    type: "success",
    text: "Το αντίγραφο ασφαλείας δημιουργήθηκε επιτυχώς.",
  });
}

async function importBackup(
  event: React.ChangeEvent<HTMLInputElement>
): Promise<void> {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  try {
    const isJsonFile =
      file.type === "application/json" ||
      file.name.toLowerCase().endsWith(".json");

    if (!isJsonFile) {
      throw new Error("Το αρχείο δεν είναι JSON.");
    }

    const fileText = await file.text();
    const parsedData: unknown = JSON.parse(fileText);

    if (!isValidBackup(parsedData)) {
      throw new Error(
        "Το αρχείο δεν έχει έγκυρη μορφή backup."
      );
    }

    const shouldImport = window.confirm(
      "Η εισαγωγή θα αντικαταστήσει όλες τις υπάρχουσες εργασίες, σημειώσεις και συμβάντα. Θέλεις να συνεχίσεις;"
    );

    if (!shouldImport) {
      return;
    }

    setTodos(parsedData.todos);
    setNotes(parsedData.notes);
    setCalendarEvents(parsedData.calendarEvents);
    setTheme(parsedData.theme);

    setTodoFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setDueDateFilter("all");

    setEditingTodoId(null);
    setEditingNoteId(null);
    setEditingEventId(null);

    setDataMessage({
      type: "success",
      text: `Η επαναφορά ολοκληρώθηκε: ${parsedData.todos.length} εργασίες, ${parsedData.notes.length} σημειώσεις και ${parsedData.calendarEvents.length} συμβάντα.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Παρουσιάστηκε άγνωστο σφάλμα.";

    setDataMessage({
      type: "error",
      text: `Η εισαγωγή απέτυχε. ${message}`,
    });
  } finally {
    event.target.value = "";
  }
}

function clearAllApplicationData(): void {
  const shouldClear = window.confirm(
    "ΠΡΟΣΟΧΗ: Θα διαγραφούν όλες οι εργασίες, οι σημειώσεις και τα συμβάντα. Η ενέργεια δεν αναιρείται. Θέλεις να συνεχίσεις;"
  );

  if (!shouldClear) {
    return;
  }

  const confirmationText = window.prompt(
    'Για επιβεβαίωση γράψε ακριβώς: ΔΙΑΓΡΑΦΗ'
  );

  if (confirmationText !== "ΔΙΑΓΡΑΦΗ") {
    setDataMessage({
      type: "error",
      text: "Η διαγραφή ακυρώθηκε επειδή η επιβεβαίωση δεν ήταν σωστή.",
    });

    return;
  }

  setTodos([]);
  setNotes([]);
  setCalendarEvents([]);

  setNewTodoText("");
  setNewTodoDueDate("");
  setNewTodoPriority("medium");
  setNewTodoCategory("personal");

  setNoteTitle("");
  setNoteContent("");

  setEventTitle("");
  setEventDescription("");
  setEventDate(getTodayDateString());
  setEventTime("");

  setEditingTodoId(null);
  setEditingTodoText("");
  setEditingNoteId(null);
  setEditingEventId(null);

  setTodoFilter("all");
  setPriorityFilter("all");
  setCategoryFilter("all");
  setDueDateFilter("all");

  setSelectedDate(getTodayDateString());

  const today = new Date();

  setCurrentMonth(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    )
  );

  setDataMessage({
    type: "success",
    text: "Όλα τα δεδομένα διαγράφηκαν.",
  });
}


const filteredTodos = useMemo(() => {
  const filtered = todos.filter((todo) => {
    const matchesStatus =
      todoFilter === "all" ||
      (todoFilter === "active" && !todo.completed) ||
      (todoFilter === "completed" && todo.completed);

    const matchesPriority =
      priorityFilter === "all" ||
      todo.priority === priorityFilter;

    const matchesCategory =
      categoryFilter === "all" ||
      todo.category === categoryFilter;

    const daysDifference = todo.dueDate
      ? getDaysDifference(todo.dueDate)
      : null;

    const matchesDueDate =
      dueDateFilter === "all" ||
      (dueDateFilter === "overdue" &&
        !todo.completed &&
        daysDifference !== null &&
        daysDifference < 0) ||
      (dueDateFilter === "today" &&
        !todo.completed &&
        daysDifference === 0) ||
      (dueDateFilter === "upcoming" &&
        !todo.completed &&
        daysDifference !== null &&
        daysDifference > 0) ||
      (dueDateFilter === "no-date" && !todo.dueDate);

    return (
      matchesStatus &&
      matchesPriority &&
      matchesCategory &&
      matchesDueDate
    );
  });


  return [...filtered].sort((firstTodo, secondTodo) => {
    if (firstTodo.completed !== secondTodo.completed) {
      return firstTodo.completed ? 1 : -1;
    }

    if (firstTodo.dueDate && secondTodo.dueDate) {
      return firstTodo.dueDate.localeCompare(
        secondTodo.dueDate
      );
    }

    if (firstTodo.dueDate) {
      return -1;
    }

    if (secondTodo.dueDate) {
      return 1;
    }

    return secondTodo.createdAt - firstTodo.createdAt;
  });
}, [
  todos,
  todoFilter,
  priorityFilter,
  categoryFilter,
  dueDateFilter,
]);

  const filteredNotes = useMemo(() => {
    const normalizedSearch = notesSearch.trim().toLocaleLowerCase("el");

    const sortedNotes = [...notes].sort(
      (firstNote, secondNote) =>
        secondNote.updatedAt - firstNote.updatedAt
    );

    if (!normalizedSearch) {
      return sortedNotes;
    }

    return sortedNotes.filter((note) => {
      const title = note.title.toLocaleLowerCase("el");
      const content = note.content.toLocaleLowerCase("el");

      return (
        title.includes(normalizedSearch) ||
        content.includes(normalizedSearch)
      );
    });
  }, [notes, notesSearch]);

  const [currentMonth, setCurrentMonth] = useState(
  () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
);

const calendarDays = useMemo(
  () => getCalendarDays(currentMonth),
  [currentMonth]
);

const [selectedDate, setSelectedDate] = useState(
  getTodayDateString()
);

const selectedDateTodos = useMemo(
  () => todos.filter((todo) => todo.dueDate === selectedDate),
  [todos, selectedDate]
);

const selectedDateEvents = useMemo(
  () =>
    calendarEvents
      .filter((event) => event.date === selectedDate)
      .sort((firstEvent, secondEvent) =>
        firstEvent.time.localeCompare(secondEvent.time)
      ),
   [calendarEvents, selectedDate]
);

const currentMonthLabel = new Intl.DateTimeFormat("el-GR", {
  month: "long",
  year: "numeric",
}).format(currentMonth);



const [eventTitle, setEventTitle] = useState("");
const [eventDescription, setEventDescription] = useState("");
const [eventDate, setEventDate] = useState(getTodayDateString());
const [eventTime, setEventTime] = useState("");
const [editingEventId, setEditingEventId] = useState<string | null>(
  null
);

  function addTodo(): void {
    const trimmedText = newTodoText.trim();

    if (!trimmedText) {
      return;
    }

 const newTodo: Todo = {
  id: createId(),
  text: trimmedText,
  completed: false,
  createdAt: Date.now(),
  dueDate: newTodoDueDate || undefined,
  priority: newTodoPriority,
  category: newTodoCategory,
};

    setTodos((currentTodos) => [newTodo, ...currentTodos]);
    setNewTodoText("");
    setNewTodoDueDate("");
  }

  function handleTodoSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): void {
    event.preventDefault();
    addTodo();
  }

  function toggleTodo(todoId: string): void {
    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === todoId
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    );
  }

  function deleteTodo(todoId: string): void {
    setTodos((currentTodos) =>
      currentTodos.filter((todo) => todo.id !== todoId)
    );

    if (editingTodoId === todoId) {
      cancelTodoEditing();
    }
  }

  function startTodoEditing(todo: Todo): void {
    setEditingTodoId(todo.id);
    setEditingTodoText(todo.text);
  }

  function saveTodoEditing(todoId: string): void {
    const trimmedText = editingTodoText.trim();

    if (!trimmedText) {
      return;
    }

    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === todoId ? { ...todo, text: trimmedText } : todo
      )
    );

    cancelTodoEditing();
  }

  function cancelTodoEditing(): void {
    setEditingTodoId(null);
    setEditingTodoText("");
  }

  function clearCompletedTodos(): void {
    setTodos((currentTodos) =>
      currentTodos.filter((todo) => !todo.completed)
    );
  }

  function saveNote(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const trimmedTitle = noteTitle.trim();
    const trimmedContent = noteContent.trim();

    if (!trimmedTitle && !trimmedContent) {
      return;
    }

    if (editingNoteId) {
      setNotes((currentNotes) =>
        currentNotes.map((note) =>
          note.id === editingNoteId
            ? {
                ...note,
                title: trimmedTitle || "Χωρίς τίτλο",
                content: trimmedContent,
                updatedAt: Date.now(),
              }
            : note
        )
      );
    } else {
      const newNote: Note = {
        id: createId(),
        title: trimmedTitle || "Χωρίς τίτλο",
        content: trimmedContent,
        updatedAt: Date.now(),
      };

      setNotes((currentNotes) => [newNote, ...currentNotes]);
    }

    resetNoteForm();
  }

  function startNoteEditing(note: Note): void {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function deleteNote(noteId: string): void {
    const shouldDelete = window.confirm(
      "Θέλεις σίγουρα να διαγράψεις αυτή τη σημείωση;"
    );

    if (!shouldDelete) {
      return;
    }

    setNotes((currentNotes) =>
      currentNotes.filter((note) => note.id !== noteId)
    );

    if (editingNoteId === noteId) {
      resetNoteForm();
    }
  }

  function resetNoteForm(): void {
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteContent("");
  }

function goToPreviousMonth(): void {
  setCurrentMonth(
    (currentDate) =>
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      )
  );
}

function goToNextMonth(): void {
  setCurrentMonth(
    (currentDate) =>
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
      )
  );
}

function goToToday(): void {
  const today = new Date();

  setCurrentMonth(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  setSelectedDate(getTodayDateString());
  setEventDate(getTodayDateString());
}

function selectCalendarDate(date: Date): void {
  const formattedDate = formatDateForStorage(date);

  setSelectedDate(formattedDate);
  setEventDate(formattedDate);
}

function saveCalendarEvent(
  event: React.FormEvent<HTMLFormElement>
): void {
  event.preventDefault();

  const trimmedTitle = eventTitle.trim();
  const trimmedDescription = eventDescription.trim();

  if (!trimmedTitle || !eventDate) {
    return;
  }

  if (editingEventId) {
    setCalendarEvents((currentEvents) =>
      currentEvents.map((calendarEvent) =>
        calendarEvent.id === editingEventId
          ? {
              ...calendarEvent,
              title: trimmedTitle,
              description: trimmedDescription,
              date: eventDate,
              time: eventTime,
            }
          : calendarEvent
      )
    );
  } else {
    const newEvent: CalendarEvent = {
      id: createId(),
      title: trimmedTitle,
      description: trimmedDescription,
      date: eventDate,
      time: eventTime,
      createdAt: Date.now(),
    };

    setCalendarEvents((currentEvents) => [
      ...currentEvents,
      newEvent,
    ]);
  }

  setSelectedDate(eventDate);
  resetCalendarEventForm();
}

function startCalendarEventEditing(
  calendarEvent: CalendarEvent
): void {
  setEditingEventId(calendarEvent.id);
  setEventTitle(calendarEvent.title);
  setEventDescription(calendarEvent.description);
  setEventDate(calendarEvent.date);
  setEventTime(calendarEvent.time);
}

function resetCalendarEventForm(): void {
  setEditingEventId(null);
  setEventTitle("");
  setEventDescription("");
  setEventDate(selectedDate);
  setEventTime("");
}

function deleteCalendarEvent(eventId: string): void {
  const shouldDelete = window.confirm(
    "Θέλεις σίγουρα να διαγράψεις αυτό το συμβάν;"
  );

  if (!shouldDelete) {
    return;
  }

  setCalendarEvents((currentEvents) =>
    currentEvents.filter(
      (calendarEvent) => calendarEvent.id !== eventId
    )
  );

  if (editingEventId === eventId) {
    resetCalendarEventForm();
  }
}


  function formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat("el-GR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-content">
          <div>
            <p className="eyebrow">Productivity workspace</p>
            <h1>Tasks & Notes</h1>
            <p className="header-description">
              Οργάνωσε τις εργασίες και τις σημειώσεις σου σε ένα μέρος.
            </p>
          </div>
<div className="header-actions">
  <div
    className={
      isOnline
        ? "connection-status online"
        : "connection-status offline"
    }
  >
    <span className="connection-dot" />

    {isOnline ? "Online" : "Offline"}
  </div>

  {!isInstalled && installPrompt && (
    <button
      type="button"
      className="install-button"
      onClick={installApplication}
    >
      Εγκατάσταση εφαρμογής
    </button>
  )}

  <button
    type="button"
    className="theme-button"
    onClick={() =>
      setTheme((currentTheme) =>
        currentTheme === "light"
          ? "dark"
          : "light"
      )
    }
    aria-label="Αλλαγή θέματος"
  >
    <span aria-hidden="true">
      {theme === "light" ? "🌙" : "☀️"}
    </span>

    {theme === "light"
      ? "Dark mode"
      : "Light mode"}
  </button>
</div>


        </div>
      </header>
{!isOnline && (
  <div className="offline-banner" role="status">
    Βρίσκεσαι εκτός σύνδεσης. Μπορείς να συνεχίσεις να χρησιμοποιείς
    την εφαρμογή, αλλά οι διαδικτυακές λειτουργίες δεν είναι διαθέσιμες.
  </div>
)}
      <main className="app-main">
        <section className="summary-grid">
          <article className="summary-card">
            <span className="summary-label">Συνολικές εργασίες</span>
            <strong>{todos.length}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">Ενεργές εργασίες</span>
            <strong>{activeTodosCount}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">Ολοκληρωμένες</span>
            <strong>{completedTodosCount}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">Σημειώσεις</span>
            <strong>{notes.length}</strong>
          </article>
        </section>
<br></br>
        <article className="summary-card overdue-summary-card">
  <span className="summary-label">
    Ληξιπρόθεσμες
  </span>

  <strong>{overdueTodosCount}</strong>
</article>

       <nav className="main-tabs" aria-label="Κύρια πλοήγηση">
  <button
    type="button"
    className={activeTab === "calendar" ? "tab active" : "tab"}
    onClick={() => setActiveTab("calendar")}
  >
    Ημερολόγιο
  </button>

  <button
    type="button"
    className={activeTab === "todos" ? "tab active" : "tab"}
    onClick={() => setActiveTab("todos")}
  >
    Εργασίες
  </button>

  <button
    type="button"
    className={activeTab === "notes" ? "tab active" : "tab"}
    onClick={() => setActiveTab("notes")}
  >
    Σημειώσεις
  </button>

  <button
  type="button"
  className={
    activeTab === "settings" ? "tab active" : "tab"
  }
  onClick={() => setActiveTab("settings")}
>
  Ρυθμίσεις
</button>
</nav>

{activeTab === "calendar" && (
  <DndContext
    sensors={dragSensors}
    onDragStart={handleCalendarDragStart}
    onDragEnd={handleCalendarDragEnd}
    onDragCancel={handleCalendarDragCancel}
  >
    <section className="calendar-layout">
    <article className="workspace-card calendar-card">
      <div className="calendar-header">
        <div>
          <p className="section-kicker">Calendar</p>
          <h2 className="calendar-month-title">
            {currentMonthLabel}
          </h2>
          <p className="calendar-drag-help">
  Σύρε μια εργασία ή ένα συμβάν σε άλλη ημέρα για να αλλάξεις την
  ημερομηνία του.
</p>
        </div>

        <div className="calendar-navigation">
          <button
            type="button"
            className="secondary-button calendar-nav-button"
            onClick={goToToday}
          >
            Σήμερα
          </button>

          <button
            type="button"
            className="calendar-arrow-button"
            onClick={goToPreviousMonth}
            aria-label="Προηγούμενος μήνας"
          >
            ‹
          </button>

          <button
            type="button"
            className="calendar-arrow-button"
            onClick={goToNextMonth}
            aria-label="Επόμενος μήνας"
          >
            ›
          </button>
        </div>
      </div>

      <div className="calendar-weekdays">
        <span>Δευ</span>
        <span>Τρι</span>
        <span>Τετ</span>
        <span>Πεμ</span>
        <span>Παρ</span>
        <span>Σαβ</span>
        <span>Κυρ</span>
      </div>

      {dragMessage && (
  <div className="calendar-drag-message" role="status">
    <span>{dragMessage}</span>

    <button
      type="button"
      onClick={() => setDragMessage(null)}
      aria-label="Κλείσιμο μηνύματος"
    >
      ×
    </button>
  </div>
)}

      <div className="calendar-grid">
        {calendarDays.map((date) => {
          const dateString = formatDateForStorage(date);

          const dayTodos = todos.filter(
            (todo) => todo.dueDate === dateString
          );

          const dayEvents = calendarEvents.filter(
            (calendarEvent) =>
              calendarEvent.date === dateString
          );

          const isCurrentMonth =
            date.getMonth() === currentMonth.getMonth();

          const isToday =
            dateString === getTodayDateString();

          const isSelected =
            dateString === selectedDate;

          return (
            <DroppableCalendarDay
  key={dateString}
  dateString={dateString}
  className={[
    "calendar-day",
    !isCurrentMonth ? "outside-month" : "",
    isToday ? "today" : "",
    isSelected ? "selected" : "",
  ]
    .filter(Boolean)
    .join(" ")}
  onClick={() => selectCalendarDate(date)}
>
              <span className="calendar-day-number">
                {date.getDate()}
              </span>

              <div className="calendar-day-items">
                {dayTodos.slice(0, 2).map((todo) => (
  <DraggableCalendarItem
    key={todo.id}
    id={`todo-${todo.id}`}
    data={{
      type: "todo",
      itemId: todo.id,
      title: todo.text,
      sourceDate: dateString,
    }}
    className={[
      "calendar-item",
      "todo",
      `priority-${todo.priority ?? "none"}`,
      todo.completed ? "completed" : "",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {todo.text}
  </DraggableCalendarItem>
))}

               {dayEvents.slice(0, 2).map((calendarEvent) => (
  <DraggableCalendarItem
    key={calendarEvent.id}
    id={`event-${calendarEvent.id}`}
    data={{
      type: "event",
      itemId: calendarEvent.id,
      title: calendarEvent.title,
      sourceDate: dateString,
    }}
    className="calendar-item event"
  >
    {calendarEvent.time
      ? `${calendarEvent.time} `
      : ""}
    {calendarEvent.title}
  </DraggableCalendarItem>
))}

                {dayTodos.length + dayEvents.length > 4 && (
                  <span className="calendar-more-items">
                    +
                    {dayTodos.length +
                      dayEvents.length -
                      4}{" "}
                    ακόμη
                  </span>
                )}
              </div>
         </DroppableCalendarDay>
          );
        })}
      </div>
    </article>

    <aside className="calendar-sidebar">
      <article className="workspace-card selected-day-card">
        <div className="section-header">
          <div>
            <p className="section-kicker">Επιλεγμένη ημέρα</p>
            <h2>
              {new Intl.DateTimeFormat("el-GR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(
                new Date(`${selectedDate}T12:00:00`)
              )}
            </h2>
          </div>
        </div>

        <div className="selected-day-section">
          <h3>Εργασίες</h3>

          {selectedDateTodos.length === 0 ? (
            <p className="calendar-empty-text">
              Δεν υπάρχουν εργασίες για αυτή την ημέρα.
            </p>
          ) : (
            <div className="selected-day-list">
              {selectedDateTodos.map((todo) => (
                <label
                  className={
                    todo.completed
                      ? "selected-day-item completed"
                      : "selected-day-item"
                  }
                  key={todo.id}
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                  />

                  <span>{todo.text}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="selected-day-section">
          <h3>Συμβάντα</h3>

          {selectedDateEvents.length === 0 ? (
            <p className="calendar-empty-text">
              Δεν υπάρχουν συμβάντα για αυτή την ημέρα.
            </p>
          ) : (
            <div className="selected-day-list">
              {selectedDateEvents.map((calendarEvent) => (
                <article
                  className="selected-event-item"
                  key={calendarEvent.id}
                >
                  <div>
                    <strong>{calendarEvent.title}</strong>

                    {calendarEvent.time && (
                      <span className="event-time">
                        {calendarEvent.time}
                      </span>
                    )}

                    {calendarEvent.description && (
                      <p>{calendarEvent.description}</p>
                    )}
                  </div>

                  <div className="item-actions">
                    <button
                      type="button"
                      className="action-button"
                      onClick={() =>
                        startCalendarEventEditing(calendarEvent)
                      }
                    >
                      Επεξεργασία
                    </button>

                    <button
                      type="button"
                      className="action-button delete"
                      onClick={() =>
                        deleteCalendarEvent(calendarEvent.id)
                      }
                    >
                      Διαγραφή
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </article>

      <article className="workspace-card calendar-event-form-card">
        <div className="section-header">
          <div>
            <p className="section-kicker">
              {editingEventId
                ? "Επεξεργασία συμβάντος"
                : "Νέο συμβάν"}
            </p>

            <h2>
              {editingEventId
                ? "Ενημέρωση συμβάντος"
                : "Προσθήκη στο ημερολόγιο"}
            </h2>
          </div>
        </div>

        <form
          className="note-form"
          onSubmit={saveCalendarEvent}
        >
          <label>
            Τίτλος

            <input
              type="text"
              value={eventTitle}
              onChange={(event) =>
                setEventTitle(event.target.value)
              }
              placeholder="π.χ. Ραντεβού με καθηγητή"
              maxLength={100}
              required
            />
          </label>

          <div className="calendar-form-row">
            <label>
              Ημερομηνία

              <input
                type="date"
                value={eventDate}
                onChange={(event) =>
                  setEventDate(event.target.value)
                }
                required
              />
            </label>

            <label>
              Ώρα

              <input
                type="time"
                value={eventTime}
                onChange={(event) =>
                  setEventTime(event.target.value)
                }
              />
            </label>
          </div>

          <label>
            Περιγραφή

            <textarea
              value={eventDescription}
              onChange={(event) =>
                setEventDescription(event.target.value)
              }
              placeholder="Προαιρετικές πληροφορίες..."
              rows={4}
              maxLength={1000}
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="primary-button">
              {editingEventId
                ? "Αποθήκευση αλλαγών"
                : "Προσθήκη συμβάντος"}
            </button>

            {editingEventId && (
              <button
                type="button"
                className="secondary-button"
                onClick={resetCalendarEventForm}
              >
                Ακύρωση
              </button>
            )}
          </div>
        </form>
      </article>
    </aside>
    </section>

    <DragOverlay>
      {activeDragItem ? (
        <div className="calendar-drag-overlay">
          <span>
            {activeDragItem.type === "todo"
              ? "Εργασία"
              : "Συμβάν"}
          </span>

          <strong>{activeDragItem.title}</strong>
        </div>
      ) : null}
    </DragOverlay>
  </DndContext>
)}
        {activeTab === "todos" && (
          <section className="workspace-card">
            <div className="section-header">
              <div>
                <p className="section-kicker">To-do list</p>
                <h2>Οι εργασίες μου</h2>
              </div>

              {completedTodosCount > 0 && (
                <button
                  type="button"
                  className="text-button danger-text"
                  onClick={clearCompletedTodos}
                >
                  Διαγραφή ολοκληρωμένων
                </button>
              )}
            </div>

<form
  className="todo-form todo-create-form"
  onSubmit={handleTodoSubmit}
>
  <div className="todo-main-input">
    <label htmlFor="new-todo">
      Εργασία
    </label>

    <input
      id="new-todo"
      type="text"
      value={newTodoText}
      onChange={(event) =>
        setNewTodoText(event.target.value)
      }
      placeholder="Γράψε μια νέα εργασία..."
      maxLength={150}
    />
  </div>

  <div className="todo-form-field">
    <label htmlFor="todo-due-date">
      Προθεσμία
    </label>

    <input
      id="todo-due-date"
      type="date"
      value={newTodoDueDate}
      onChange={(event) =>
        setNewTodoDueDate(event.target.value)
      }
    />
  </div>

  <div className="todo-form-field">
    <label htmlFor="todo-priority">
      Προτεραιότητα
    </label>

    <select
      id="todo-priority"
      value={newTodoPriority}
      onChange={(event) =>
        setNewTodoPriority(
          event.target.value as TodoPriority
        )
      }
    >
      <option value="low">Χαμηλή</option>
      <option value="medium">Μεσαία</option>
      <option value="high">Υψηλή</option>
    </select>
  </div>

  <div className="todo-form-field">
    <label htmlFor="todo-category">
      Κατηγορία
    </label>

    <select
      id="todo-category"
      value={newTodoCategory}
      onChange={(event) =>
        setNewTodoCategory(
          event.target.value as TodoCategory
        )
      }
    >
      <option value="personal">Προσωπικά</option>
      <option value="studies">Σχολή</option>
      <option value="work">Εργασία</option>
      <option value="other">Άλλο</option>
    </select>
  </div>

  <button
    type="submit"
    className="primary-button todo-add-button"
  >
    Προσθήκη
  </button>
</form>

            <div className="filter-row">
              <button
                type="button"
                className={
                  todoFilter === "all"
                    ? "filter-button active"
                    : "filter-button"
                }
                onClick={() => setTodoFilter("all")}
              >
                Όλες
                <span>{todos.length}</span>
              </button>

              <button
                type="button"
                className={
                  todoFilter === "active"
                    ? "filter-button active"
                    : "filter-button"
                }
                onClick={() => setTodoFilter("active")}
              >
                Ενεργές
                <span>{activeTodosCount}</span>
              </button>

              <button
                type="button"
                className={
                  todoFilter === "completed"
                    ? "filter-button active"
                    : "filter-button"
                }
                onClick={() => setTodoFilter("completed")}
              >
                Ολοκληρωμένες
                <span>{completedTodosCount}</span>
              </button>
            </div>

            <div className="advanced-filters">
  <div className="filter-field">
    <label htmlFor="priority-filter">
      Προτεραιότητα
    </label>

    <select
      id="priority-filter"
      value={priorityFilter}
      onChange={(event) =>
        setPriorityFilter(
          event.target.value as PriorityFilter
        )
      }
    >
      <option value="all">Όλες</option>
      <option value="high">Υψηλή</option>
      <option value="medium">Μεσαία</option>
      <option value="low">Χαμηλή</option>
    </select>
  </div>

  <div className="filter-field">
    <label htmlFor="category-filter">
      Κατηγορία
    </label>

    <select
      id="category-filter"
      value={categoryFilter}
      onChange={(event) =>
        setCategoryFilter(
          event.target.value as CategoryFilter
        )
      }
    >
      <option value="all">Όλες</option>
      <option value="personal">Προσωπικά</option>
      <option value="studies">Σχολή</option>
      <option value="work">Εργασία</option>
      <option value="other">Άλλο</option>
    </select>
  </div>

  <div className="filter-field">
  <label htmlFor="due-date-filter">
    Προθεσμία
  </label>

  <select
    id="due-date-filter"
    value={dueDateFilter}
    onChange={(event) =>
      setDueDateFilter(
        event.target.value as DueDateFilter
      )
    }
  >
    <option value="all">Όλες</option>
    <option value="overdue">
      Ληξιπρόθεσμες
    </option>
    <option value="today">
      Λήγουν σήμερα
    </option>
    <option value="upcoming">
      Επερχόμενες
    </option>
    <option value="no-date">
      Χωρίς προθεσμία
    </option>
  </select>
</div>

  {(priorityFilter !== "all" ||
  categoryFilter !== "all" ||
  dueDateFilter !== "all") && (
    <button
      type="button"
      className="secondary-button clear-filters-button"
      onClick={() => {
  setPriorityFilter("all");
  setCategoryFilter("all");
  setDueDateFilter("all");
}}
    >
      Καθαρισμός φίλτρων
    </button>
  )}
</div>

<div className="deadline-overview">
  <button
    type="button"
    className="deadline-overview-item overdue"
    onClick={() => setDueDateFilter("overdue")}
  >
    <strong>{overdueTodosCount}</strong>
    <span>Ληξιπρόθεσμες</span>
  </button>

  <button
    type="button"
    className="deadline-overview-item today"
    onClick={() => setDueDateFilter("today")}
  >
    <strong>{todayTodosCount}</strong>
    <span>Σήμερα</span>
  </button>

  <button
    type="button"
    className="deadline-overview-item upcoming"
    onClick={() => setDueDateFilter("upcoming")}
  >
    <strong>{upcomingTodosCount}</strong>
    <span>Επερχόμενες</span>
  </button>
</div>

            <div className="todo-list">
              {filteredTodos.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✓</div>
                  <h3>Δεν υπάρχουν εργασίες</h3>
                  <p>
                    Πρόσθεσε μια νέα εργασία ή άλλαξε το επιλεγμένο φίλτρο.
                  </p>
                </div>
              ) : (
                filteredTodos.map((todo) => (
                  <article
                    className={
                      todo.completed
                        ? "todo-item completed"
                        : "todo-item"
                    }
                    key={todo.id}
                  >
                    <label className="todo-check">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id)}
                      />

                      <span className="custom-checkbox" />
                    </label>

                    <div className="todo-content">
                      {editingTodoId === todo.id ? (
                        <input
                          className="todo-edit-input"
                          type="text"
                          value={editingTodoText}
                          onChange={(event) =>
                            setEditingTodoText(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              saveTodoEditing(todo.id);
                            }

                            if (event.key === "Escape") {
                              cancelTodoEditing();
                            }
                          }}
                          autoFocus
                          maxLength={150}
                        />
                      ) : (
                        <>
                        <p>{todo.text}</p>

<div className="todo-meta">
  <span
    className={`todo-badge priority-${
      todo.priority ?? "none"
    }`}
  >
    {getPriorityLabel(todo.priority)}
  </span>

  <span className="todo-badge category-badge">
    {getCategoryLabel(todo.category)}
  </span>
</div>

<small>
  Δημιουργήθηκε: {formatDate(todo.createdAt)}
</small>


{todo.dueDate && (
  <div
    className={[
      "todo-due-status",
      `due-${getDueDateStatus(
        todo.dueDate,
        todo.completed
      )}`,
    ].join(" ")}
  >
    <strong>
      {getDueDateLabel(
        todo.dueDate,
        todo.completed
      )}
    </strong>

    <span>
      {new Intl.DateTimeFormat("el-GR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(
        new Date(`${todo.dueDate}T12:00:00`)
      )}
    </span>
  </div>
)}
                        </>
                      )}
                    </div>

                    <div className="item-actions">
                      {editingTodoId === todo.id ? (
                        <>
                          <button
                            type="button"
                            className="action-button save"
                            onClick={() => saveTodoEditing(todo.id)}
                          >
                            Αποθήκευση
                          </button>

                          <button
                            type="button"
                            className="action-button"
                            onClick={cancelTodoEditing}
                          >
                            Ακύρωση
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="action-button"
                            onClick={() => startTodoEditing(todo)}
                          >
                            Επεξεργασία
                          </button>

                          <button
                            type="button"
                            className="action-button delete"
                            onClick={() => deleteTodo(todo.id)}
                          >
                            Διαγραφή
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === "notes" && (
          <section className="notes-layout">
            <article className="workspace-card note-editor-card">
              <div className="section-header">
                <div>
                  <p className="section-kicker">
                    {editingNoteId
                      ? "Επεξεργασία σημείωσης"
                      : "Νέα σημείωση"}
                  </p>

                  <h2>
                    {editingNoteId
                      ? "Ενημέρωσε τη σημείωση"
                      : "Κατέγραψε μια ιδέα"}
                  </h2>
                </div>
              </div>

              <form className="note-form" onSubmit={saveNote}>
                <label>
                  Τίτλος

                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(event) =>
                      setNoteTitle(event.target.value)
                    }
                    placeholder="Τίτλος σημείωσης"
                    maxLength={100}
                  />
                </label>

                <label>
                  Περιεχόμενο

                  <textarea
                    value={noteContent}
                    onChange={(event) =>
                      setNoteContent(event.target.value)
                    }
                    placeholder="Γράψε τη σημείωσή σου..."
                    rows={9}
                    maxLength={5000}
                  />
                </label>

                <div className="form-actions">
                  <button type="submit" className="primary-button">
                    {editingNoteId
                      ? "Αποθήκευση αλλαγών"
                      : "Αποθήκευση σημείωσης"}
                  </button>

                  {editingNoteId && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={resetNoteForm}
                    >
                      Ακύρωση
                    </button>
                  )}
                </div>
              </form>
            </article>

            <article className="workspace-card notes-list-card">
              <div className="section-header">
                <div>
                  <p className="section-kicker">Notes</p>
                  <h2>Οι σημειώσεις μου</h2>
                </div>

                <span className="results-count">
                  {filteredNotes.length} αποτελέσματα
                </span>
              </div>

              <input
                className="notes-search"
                type="search"
                value={notesSearch}
                onChange={(event) =>
                  setNotesSearch(event.target.value)
                }
                placeholder="Αναζήτηση σημειώσεων..."
                aria-label="Αναζήτηση σημειώσεων"
              />

              <div className="notes-grid">
                {filteredNotes.length === 0 ? (
                  <div className="empty-state notes-empty-state">
                    <div className="empty-icon">✎</div>
                    <h3>Δεν βρέθηκαν σημειώσεις</h3>
                    <p>
                      Δημιούργησε την πρώτη σου σημείωση ή άλλαξε την
                      αναζήτηση.
                    </p>
                  </div>
                ) : (
                  filteredNotes.map((note) => (
                    <article className="note-card" key={note.id}>
                      <div className="note-card-content">
                        <h3>{note.title}</h3>

                        <p>
                          {note.content || "Η σημείωση δεν έχει περιεχόμενο."}
                        </p>
                      </div>

                      <div className="note-card-footer">
                        <small>
                          {formatDate(note.updatedAt)}
                        </small>

                        <div className="item-actions">
                          <button
                            type="button"
                            className="action-button"
                            onClick={() => startNoteEditing(note)}
                          >
                            Επεξεργασία
                          </button>

                          <button
                            type="button"
                            className="action-button delete"
                            onClick={() => deleteNote(note.id)}
                          >
                            Διαγραφή
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </article>
          </section>
        )}

        {activeTab === "settings" && (
  <section className="settings-layout">
    <article className="workspace-card settings-card">
      <div className="section-header">
        <div>
          <p className="section-kicker">
            Διαχείριση δεδομένων
          </p>

          <h2>Αντίγραφο ασφαλείας</h2>
        </div>
      </div>

      <p className="settings-description">
        Τα δεδομένα της εφαρμογής αποθηκεύονται μόνο στον
        συγκεκριμένο browser. Δημιούργησε τακτικά αντίγραφο
        ασφαλείας, ειδικά πριν καθαρίσεις τα δεδομένα του browser
        ή αλλάξεις συσκευή.
      </p>

      {dataMessage && (
        <div
          className={`data-message ${dataMessage.type}`}
          role={
            dataMessage.type === "error"
              ? "alert"
              : "status"
          }
        >
          <span>{dataMessage.text}</span>

          <button
            type="button"
            onClick={() => setDataMessage(null)}
            aria-label="Κλείσιμο μηνύματος"
          >
            ×
          </button>
        </div>
      )}

      <div className="storage-summary">
        <article>
          <span>Εργασίες</span>
          <strong>{todos.length}</strong>
        </article>

        <article>
          <span>Σημειώσεις</span>
          <strong>{notes.length}</strong>
        </article>

        <article>
          <span>Συμβάντα</span>
          <strong>{calendarEvents.length}</strong>
        </article>
      </div>

      <div className="settings-actions-grid">
        <article className="settings-action-card">
          <div>
            <h3>Εξαγωγή δεδομένων</h3>

            <p>
              Κατέβασε ένα αρχείο JSON που περιλαμβάνει όλες τις
              εργασίες, τις σημειώσεις, τα συμβάντα και το θέμα
              εμφάνισης.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={exportBackup}
          >
            Εξαγωγή backup
          </button>
        </article>

        <article className="settings-action-card">
          <div>
            <h3>Εισαγωγή δεδομένων</h3>

            <p>
              Επίλεξε ένα έγκυρο αρχείο backup. Τα υπάρχοντα
              δεδομένα θα αντικατασταθούν.
            </p>
          </div>

          <label className="file-import-button">
            Επιλογή αρχείου backup

            <input
              type="file"
              accept=".json,application/json"
              onChange={importBackup}
            />
          </label>
        </article>
      </div>
    </article>
<article className="workspace-card install-settings-card">
  <div className="section-header">
    <div>
      <p className="section-kicker">
        Εγκατάσταση
      </p>

      <h2>Εφαρμογή στη συσκευή</h2>
    </div>
  </div>

  <p className="settings-description">
    Εγκατέστησε την εφαρμογή για να ανοίγει σε ανεξάρτητο παράθυρο
    και να λειτουργεί πιο άμεσα από την αρχική οθόνη ή το desktop.
  </p>

  {isInstalled ? (
    <div className="installed-status">
      Η εφαρμογή είναι ήδη εγκατεστημένη.
    </div>
  ) : installPrompt ? (
    <button
      type="button"
      className="primary-button"
      onClick={installApplication}
    >
      Εγκατάσταση εφαρμογής
    </button>
  ) : (
    <p className="install-help-text">
      Η αυτόματη εγκατάσταση δεν είναι διαθέσιμη σε αυτόν τον browser.
      Σε iPhone ή iPad χρησιμοποίησε Κοινοποίηση → Προσθήκη στην αρχική οθόνη.
    </p>
  )}
</article>
    <article className="workspace-card danger-zone-card">
      <div className="section-header">
        <div>
          <p className="section-kicker danger-kicker">
            Επικίνδυνη ζώνη
          </p>

          <h2>Διαγραφή δεδομένων</h2>
        </div>
      </div>

      <p className="settings-description">
        Η διαγραφή αφαιρεί μόνιμα όλες τις εργασίες, τις σημειώσεις
        και τα συμβάντα από αυτόν τον browser. Δεν υπάρχει
        δυνατότητα αναίρεσης χωρίς προηγούμενο backup.
      </p>

      <button
        type="button"
        className="danger-button"
        onClick={clearAllApplicationData}
      >
        Διαγραφή όλων των δεδομένων
      </button>
    </article>
  </section>
)}
      </main>

      <footer className="app-footer">
        <p>Tasks & Notes — Τα δεδομένα αποθηκεύονται τοπικά στη συσκευή.</p>
      </footer>
    </div>
  );
}

export default App;