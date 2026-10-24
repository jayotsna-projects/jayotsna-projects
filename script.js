
"use strict";

// ==========================================
// EventEase - Frontend demonstration
// ==========================================

const KEYS = {
  users: "ee_v2_users",
  events: "ee_v2_events",
  registrations: "ee_v2_registrations",
  session: "ee_v2_session"
};

const $ = (selector) => document.querySelector(selector);

const authView = $("#authView");
const userView = $("#userView");
const adminView = $("#adminView");
const toast = $("#toast");

const ADMIN = {
  id: "demo-admin",
  name: "EventEase Administrator",
  email: "admin@eventease.demo",
  password: "Admin123!",
  department: "Event Management",
  role: "admin"
};

const symbols = {
  Technical: "⌘",
  Cultural: "✳",
  Workshop: "✎",
  Sports: "◉",
  Seminar: "✦"
};

const categories = [
  "Technical", "Cultural", "Workshop", "Sports", "Seminar"
];

let users = readArray(KEYS.users);
let events = readArray(KEYS.events);
let registrations = readArray(KEYS.registrations);
let currentUser = null;
let toastTimer = null;

// ---------- Storage and helpers ----------

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveAll() {
  try {
    localStorage.setItem(KEYS.users, JSON.stringify(users));
    localStorage.setItem(KEYS.events, JSON.stringify(events));
    localStorage.setItem(KEYS.registrations, JSON.stringify(registrations));
    return true;
  } catch (error) {
    console.error(error);
    showToast("Could not save data. Check browser storage.");
    return false;
  }
}

function makeId() {
  return crypto.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(value) {
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric"
      });
}

function formatTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value)) return value;
  const [h, m] = value.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit"
  });
}

function isUpcoming(event) {
  return event.date >= today();
}

function getEvent(id) {
  return events.find(event => event.id === id);
}

function getEventRegistrations(eventId) {
  return registrations.filter(r =>
    r.eventId === eventId &&
    ["Pending", "Confirmed"].includes(r.status)
  );
}

// Pending requests reserve seats until confirmed, rejected or cancelled.
function occupiedSeats(eventId) {
  return getEventRegistrations(eventId).length;
}

function availableSeats(event) {
  return Math.max(0, Number(event.capacity) - occupiedSeats(event.id));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function setMessage(selector, message, success = false) {
  const element = $(selector);
  element.textContent = message;
  element.style.color = success ? "#26784f" : "#b63e36";
}

function resetMessage(selector) {
  setMessage(selector, "");
}

// ---------- Initial demo data ----------

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function seedEvents() {
  return [
    {
      id: makeId(),
      title: "Innovation Hackathon",
      category: "Technical",
      date: offsetDate(3),
      time: "09:30",
      venue: "Computer Science Lab",
      capacity: 80,
      description: "Build creative solutions, work with a team and turn your ideas into working projects."
    },
    {
      id: makeId(),
      title: "Rhythm & Roots",
      category: "Cultural",
      date: offsetDate(5),
      time: "17:00",
      venue: "College Auditorium",
      capacity: 150,
      description: "Celebrate music, dance and creativity at an exciting evening of campus performances."
    },
    {
      id: makeId(),
      title: "Web Development Bootcamp",
      category: "Workshop",
      date: offsetDate(7),
      time: "10:00",
      venue: "Innovation Centre",
      capacity: 50,
      description: "Explore HTML, CSS and JavaScript through hands-on website development."
    },
    {
      id: makeId(),
      title: "Campus Sports Day",
      category: "Sports",
      date: offsetDate(10),
      time: "08:00",
      venue: "College Sports Ground",
      capacity: 120,
      description: "Join fellow students for a day of games, teamwork and sporting activities."
    },
    {
      id: makeId(),
      title: "Future of Artificial Intelligence",
      category: "Seminar",
      date: offsetDate(14),
      time: "11:00",
      venue: "Main Seminar Hall",
      capacity: 100,
      description: "Explore AI applications, emerging technology and future career opportunities."
    }
  ];
}

if (events.length === 0) {
  events = seedEvents();
  saveAll();
}

// ---------- Login and account creation ----------

function showAuth(mode = "login") {
  authView.classList.remove("hidden");
  userView.classList.add("hidden");
  adminView.classList.add("hidden");

  $("#profileButton").classList.add("hidden");
  $("#logoutButton").classList.add("hidden");
  $("#sessionLabel").textContent = "Welcome to EventEase";

  switchAuthTab(mode);
}

function switchAuthTab(mode) {
  document.querySelectorAll(".auth-tab").forEach(button => {
    button.classList.toggle("active", button.dataset.auth === mode);
  });

  $("#loginForm").classList.toggle("hidden", mode !== "login");
  $("#signupForm").classList.toggle("hidden", mode !== "signup");

  resetMessage("#loginMessage");
  resetMessage("#signupMessage");
}

document.querySelectorAll(".auth-tab").forEach(button => {
  button.addEventListener("click", () => switchAuthTab(button.dataset.auth));
});

$("#loginForm").addEventListener("submit", event => {
  event.preventDefault();

  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;

  // Demo admin account.
  if (email === ADMIN.email && password === ADMIN.password) {
    currentUser = { ...ADMIN };
    startSession();
    return;
  }

  const user = users.find(item =>
    item.email.toLowerCase() === email &&
    item.password === password
  );

  if (!user) {
    setMessage("#loginMessage", "Incorrect email or password.");
    return;
  }

  currentUser = { ...user, role: "user" };
  startSession();
});

$("#signupForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("#signupName").value.trim();
  const email = $("#signupEmail").value.trim().toLowerCase();
  const department = $("#signupDepartment").value.trim();
  const password = $("#signupPassword").value;

  if (!name || !email || !department || password.length < 6) {
    setMessage("#signupMessage", "Please complete all fields correctly.");
    return;
  }

  if (email === ADMIN.email ||
      users.some(user => user.email.toLowerCase() === email)) {
    setMessage("#signupMessage", "An account with this email already exists.");
    return;
  }

  const user = {
    id: makeId(),
    name,
    email,
    department,
    password,
    role: "user"
  };

  users.push(user);

  if (!saveAll()) {
    users = users.filter(item => item.id !== user.id);
    return;
  }

  currentUser = { ...user };
  startSession();
  showToast("Account created successfully!");
});

function startSession() {
  authView.classList.add("hidden");
  $("#profileButton").classList.remove("hidden");
  $("#logoutButton").classList.remove("hidden");

  $("#sessionLabel").textContent =
    currentUser.role === "admin" ? "Administrator access" : "Student account";

  $("#avatar").textContent =
    (currentUser.name || "U").trim().charAt(0).toUpperCase();

  if (currentUser.role === "admin") {
    userView.classList.add("hidden");
    adminView.classList.remove("hidden");
    renderAdmin();
  } else {
    adminView.classList.add("hidden");
    userView.classList.remove("hidden");
    renderUser();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("#logoutButton").addEventListener("click", () => {
  currentUser = null;
  showAuth();
  $("#loginForm").reset();
  $("#signupForm").reset();
  showToast("You have logged out.");
});

$("#brandHome").addEventListener("click", event => {
  event.preventDefault();
  if (!currentUser) {
    showAuth();
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// ---------- User profile ----------

$("#profileButton").addEventListener("click", () => {
  if (!currentUser) return;

  $("#profileName").textContent = currentUser.name;
  $("#profileEmail").textContent = currentUser.email;
  $("#profileDepartment").textContent =
    currentUser.role === "admin"
      ? "Event Management"
      : currentUser.department;
  $("#profileRole").textContent =
    currentUser.role === "admin" ? "Administrator" : "Student / User";

  $("#profileAvatar").textContent =
    currentUser.name.trim().charAt(0).toUpperCase();

  $("#profileDialog").showModal();
});

// ---------- User dashboard ----------

function renderUser() {
  if (!currentUser || currentUser.role !== "user") return;

  $("#userGreeting").textContent = currentUser.name.split(" ")[0];

  const myRequests = registrations.filter(r => r.userId === currentUser.id);
  const confirmed = myRequests.filter(r => r.status === "Confirmed").length;

  $("#userUpcomingCount").textContent =
    events.filter(isUpcoming).length;
  $("#userRegistrationCount").textContent = myRequests.length;
  $("#userConfirmedCount").textContent = confirmed;

  renderUserEvents();
  renderMyRegistrations();
}

function renderUserEvents() {
  const query = $("#userSearch").value.trim().toLowerCase();

  const list = events
    .filter(isUpcoming)
    .filter(event =>
      [event.title, event.category, event.venue, event.description]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
    .sort((a, b) =>
      a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
    );

  $("#userEventsGrid").innerHTML = list.map(event => {
    const seats = availableSeats(event);

    const myRequest = registrations.find(r =>
      r.userId === currentUser.id &&
      r.eventId === event.id &&
      ["Pending", "Confirmed"].includes(r.status)
    );

    let buttonLabel = "Register →";
    let disabled = false;

    if (myRequest?.status === "Pending") {
      buttonLabel = "Awaiting approval";
      disabled = true;
    } else if (myRequest?.status === "Confirmed") {
      buttonLabel = "Registration confirmed";
      disabled = true;
    } else if (seats === 0) {
      buttonLabel = "Fully booked";
      disabled = true;
    }

    return `
      <article class="event-card">
        <div class="event-art art-${escapeHTML(event.category.toLowerCase())}">
          <span class="event-category">${escapeHTML(event.category)}</span>
          <span class="event-symbol" aria-hidden="true">${
            symbols[event.category] || "✦"
          }</span>
        </div>
        <div class="event-content">
          <span class="event-date">${escapeHTML(formatDate(event.date))}</span>
          <h3>${escapeHTML(event.title)}</h3>
          <p class="event-description">${escapeHTML(event.description)}</p>
          <div class="event-info">
            <span>◷ ${escapeHTML(formatTime(event.time))}</span>
            <span>⌖ ${escapeHTML(event.venue)}</span>
          </div>
          <div class="event-seat-row">
            <span class="seat-info"><strong>${seats}</strong> seats available</span>
            <button class="event-action" data-register="${escapeHTML(event.id)}"
              ${disabled ? "disabled" : ""}>${buttonLabel}</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  $("#userEventsEmpty").classList.toggle("hidden", list.length > 0);
}

$("#userSearch").addEventListener("input", renderUserEvents);

$("#userEventsGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-register]");
  if (!button || !currentUser || currentUser.role !== "user") return;

  requestRegistration(button.dataset.register);
});

function requestRegistration(eventId) {
  const event = getEvent(eventId);

  if (!event || !isUpcoming(event)) {
    showToast("This event is no longer available.");
    return;
  }

  if (availableSeats(event) <= 0) {
    showToast("Sorry, no seats are currently available.");
    renderUser();
    return;
  }

  const existing = registrations.find(r =>
    r.userId === currentUser.id &&
    r.eventId === eventId &&
    ["Pending", "Confirmed"].includes(r.status)
  );

  if (existing) {
    showToast("You already have an active registration.");
    return;
  }

  const request = {
    id: makeId(),
    eventId: event.id,
    eventTitle: event.title,
    userId: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    department: currentUser.department,
    status: "Pending",
    requestedAt: new Date().toISOString()
  };

  registrations.unshift(request);

  if (!saveAll()) {
    registrations = registrations.filter(r => r.id !== request.id);
    return;
  }

  renderUser();
  showToast("Request submitted. Wait for admin confirmation.");
}

function renderMyRegistrations() {
  const mine = registrations.filter(r => r.userId === currentUser.id);

  $("#myRegistrations").innerHTML = mine.map(request => {
    const event = getEvent(request.eventId);
    const dateText = event ? formatDate(event.date) : "Event unavailable";

    const canCancel = ["Pending", "Confirmed"].includes(request.status);

    return `
      <article class="my-registration">
        <div>
          <h3>${escapeHTML(request.eventTitle || event?.title || "Event")}</h3>
          <p>${escapeHTML(dateText)} · Requested ${escapeHTML(
            new Date(request.requestedAt).toLocaleDateString("en-IN")
          )}</p>
        </div>
        <div class="registration-actions">
          <span class="status status-${request.status.toLowerCase()}">${
            escapeHTML(request.status)
          }</span>
          ${canCancel ? `
            <button class="small-button" data-cancel="${escapeHTML(request.id)}">
              Cancel request
            </button>` : ""}
        </div>
      </article>
    `;
  }).join("");

  $("#myRegistrationsEmpty").classList.toggle("hidden", mine.length > 0);
}

$("#myRegistrations").addEventListener("click", event => {
  const button = event.target.closest("[data-cancel]");
  if (!button) return;

  const request = registrations.find(r =>
    r.id === button.dataset.cancel &&
    r.userId === currentUser?.id
  );

  if (!request || !["Pending", "Confirmed"].includes(request.status)) return;

  if (!window.confirm("Cancel this registration?")) return;

  request.status = "Cancelled";

  if (!saveAll()) {
    request.status = "Pending";
    return;
  }

  renderAllDashboards();
  showToast("Registration cancelled.");
});

// ---------- Admin: create and update events ----------

$("#eventDate").min = today();

$("#eventForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!currentUser || currentUser.role !== "admin") return;

  const editId = $("#editEventId").value;
  const title = $("#eventTitle").value.trim();
  const category = $("#eventCategory").value;
  const date = $("#eventDate").value;
  const time = $("#eventTime").value;
  const venue = $("#eventVenue").value.trim();
  const description = $("#eventDescription").value.trim();
  const capacity = Number($("#eventCapacity").value);

  if (
    !title || !venue || !description ||
    !categories.includes(category) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(time) ||
    date < today() ||
    !Number.isInteger(capacity) ||
    capacity < 1 || capacity > 10000
  ) {
    setMessage("#eventFormMessage", "Enter valid details and a current or future date.");
    return;
  }

  const oldEvent = editId ? getEvent(editId) : null;

  if (editId && !oldEvent) {
    setMessage("#eventFormMessage", "Event not found. Please refresh the page.");
    return;
  }

  if (oldEvent && capacity < occupiedSeats(oldEvent.id)) {
    setMessage(
      "#eventFormMessage",
      `Capacity cannot be less than ${occupiedSeats(oldEvent.id)} active requests.`
    );
    return;
  }

  const data = { title, category, date, time, venue, description, capacity };

  if (oldEvent) {
    const previous = { ...oldEvent };
    Object.assign(oldEvent, data);

    // Keep existing registrations linked to the updated event.
    registrations.forEach(r => {
      if (r.eventId === oldEvent.id) r.eventTitle = title;
    });

    if (!saveAll()) {
      Object.assign(oldEvent, previous);
      return;
    }

    showToast("Event updated successfully.");
  } else {
    const newEvent = { id: makeId(), ...data };
    events.unshift(newEvent);

    if (!saveAll()) {
      events = events.filter(item => item.id !== newEvent.id);
      return;
    }

    showToast("Event created successfully.");
  }

  resetEventForm();
  renderAllDashboards();
});

function resetEventForm() {
  $("#eventForm").reset();
  $("#editEventId").value = "";
  $("#eventDate").min = today();
  $("#eventTime").value = "10:00";
  $("#eventCapacity").value = "100";
  $("#eventFormHeading").textContent = "Create an event";
  $("#saveEventButton").textContent = "+ Create Event";
  $("#cancelEditButton").classList.add("hidden");
  resetMessage("#eventFormMessage");
}

$("#cancelEditButton").addEventListener("click", resetEventForm);

function editEvent(eventId) {
  if (!currentUser || currentUser.role !== "admin") return;

  const event = getEvent(eventId);
  if (!event) return;

  $("#editEventId").value = event.id;
  $("#eventTitle").value = event.title;
  $("#eventCategory").value = event.category;
  $("#eventDate").value = event.date;
  $("#eventDate").min = today();
  $("#eventTime").value = event.time;
  $("#eventVenue").value = event.venue;
  $("#eventCapacity").value = event.capacity;
  $("#eventDescription").value = event.description;

  $("#eventFormHeading").textContent = "Update event";
  $("#saveEventButton").textContent = "Save changes";
  $("#cancelEditButton").classList.remove("hidden");

  $("#eventForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteEvent(eventId) {
  if (!currentUser || currentUser.role !== "admin") return;

  const event = getEvent(eventId);
  if (!event) return;

  if (!window.confirm(
    `Delete "${event.title}"? Its registration history will also be deleted.`
  )) return;

  const oldEvents = events;
  const oldRegistrations = registrations;

  events = events.filter(item => item.id !== eventId);
  registrations = registrations.filter(item => item.eventId !== eventId);

  if (!saveAll()) {
    events = oldEvents;
    registrations = oldRegistrations;
    return;
  }

  if ($("#editEventId").value === eventId) resetEventForm();

  renderAllDashboards();
  showToast("Event deleted successfully.");
}

$("#adminEventsList").addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) editEvent(editButton.dataset.edit);
  if (deleteButton) deleteEvent(deleteButton.dataset.delete);
});

// ---------- Admin: event inventory ----------

function renderAdminEvents() {
  const list = [...events].sort((a, b) =>
    a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
  );

  $("#adminEventsList").innerHTML = list.map(event => {
    const occupied = occupiedSeats(event.id);
    const seats = availableSeats(event);
    const confirmed = registrations.filter(r =>
      r.eventId === event.id && r.status === "Confirmed"
    ).length;

    return `
      <article class="admin-event">
        <div class="admin-event-top">
          <div>
            <h3>${escapeHTML(event.title)}</h3>
            <p>${escapeHTML(event.category)} · ${escapeHTML(formatDate(event.date))}</p>
          </div>
          <span class="status ${seats > 0 ? "status-confirmed" : "status-rejected"}">
            ${seats > 0 ? "Open" : "Full"}
          </span>
        </div>
        <p>Venue: ${escapeHTML(event.venue)}</p>
        <p>Capacity: ${event.capacity} · Active requests: ${occupied}</p>
        <p>Confirmed: ${confirmed} · Available seats: ${seats}</p>
        <div class="admin-event-actions">
          <button class="small-button" data-edit="${escapeHTML(event.id)}">Edit</button>
          <button class="small-button reject" data-delete="${escapeHTML(event.id)}">Delete</button>
        </div>
      </article>
    `;
  }).join("");

  $("#adminEventsEmpty").classList.toggle("hidden", list.length > 0);
}

// ---------- Admin: approve or reject requests ----------

$("#requestFilter").addEventListener("change", renderAdminRequests);

$("#adminRequestsBody").addEventListener("click", event => {
  const approveButton = event.target.closest("[data-approve]");
  const rejectButton = event.target.closest("[data-reject]");

  if (approveButton) updateRequest(approveButton.dataset.approve, "Confirmed");
  if (rejectButton) updateRequest(rejectButton.dataset.reject, "Rejected");
});

function updateRequest(requestId, newStatus) {
  if (!currentUser || currentUser.role !== "admin") return;

  const request = registrations.find(r => r.id === requestId);
  if (!request || request.status !== "Pending") return;

  const event = getEvent(request.eventId);

  if (!event) {
    showToast("The event no longer exists.");
    return;
  }

  if (newStatus === "Confirmed" && availableSeats(event) <= 0) {
    showToast("No seats are available. Increase capacity before approving.");
    return;
  }

  const oldStatus = request.status;
  request.status = newStatus;
  request.reviewedAt = new Date().toISOString();

  if (!saveAll()) {
    request.status = oldStatus;
    return;
  }

  renderAllDashboards();
  showToast(newStatus === "Confirmed"
    ? "Registration confirmed."
    : "Registration rejected.");
}

function renderAdminRequests() {
  const filter = $("#requestFilter").value;

  const list = registrations.filter(request =>
    filter === "All" || request.status === filter
  );

  $("#adminRequestsBody").innerHTML = list.map(request => {
    const canReview = request.status === "Pending";

    return `
      <tr>
        <td>
          <strong>${escapeHTML(request.name)}</strong>
          <small>${escapeHTML(request.email)}</small>
          <small>${escapeHTML(request.department)}</small>
        </td>
        <td>${escapeHTML(request.eventTitle || "Event")}</td>
        <td>${getEvent(request.eventId) ? "1" : "—"}</td>
        <td><span class="status status-${request.status.toLowerCase()}">${
          escapeHTML(request.status)
        }</span></td>
        <td>
          ${canReview ? `
            <div class="request-actions">
              <button class="small-button approve" data-approve="${escapeHTML(request.id)}">Approve</button>
              <button class="small-button reject" data-reject="${escapeHTML(request.id)}">Reject</button>
            </div>
          ` : "—"}
        </td>
      </tr>
    `;
  }).join("");

  $("#adminRequestsEmpty").classList.toggle("hidden", list.length > 0);
}

function renderAdmin() {
  if (!currentUser || currentUser.role !== "admin") return;

  $("#adminEventCount").textContent = events.length;
  $("#adminPendingCount").textContent =
    registrations.filter(r => r.status === "Pending").length;

  $("#adminAvailableSeats").textContent =
    events.reduce((sum, event) => sum + availableSeats(event), 0);

  renderAdminEvents();
  renderAdminRequests();
}

// ---------- Refresh dashboards ----------

function renderAllDashboards() {
  if (!currentUser) return;

  if (currentUser.role === "admin") {
    renderAdmin();
  } else {
    renderUser();
  }
}

$("#year").textContent = new Date().getFullYear();

// Start at the login screen. Users must sign in on each page reload.
showAuth();
