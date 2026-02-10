import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, hasSupabaseEnv } from "./supabaseClient";
import { ALLOWED_EMAILS } from "./config";
import Pet from "./components/Pet";
import Settings from "./components/Settings";
import { Link, useLocation } from "react-router-dom";

const defaultGames = [
  { name: "Stardew Valley", note: "Cozy farm nights" },
  { name: "It Takes Two", note: "Co-op adventure" },
  { name: "Overcooked 2", note: "Chaotic cooking" },
];

const defaultLinks = [
  { label: "Shared calendar", url: "https://calendar.google.com" },
  { label: "Watchlist", url: "https://letterboxd.com" },
  { label: "Playlist", url: "https://open.spotify.com" },
];

type PhotoSlot = {
  id: string;
  label: string;
  imageUrl?: string;
};

type Milestone = {
  id: string;
  name: string;
  date: string;
};

type ChatMessage = {
  id: string;
  sender_email: string;
  message: string;
  created_at: string;
};

type Suggestion = {
  id: string;
  text: string;
  timestamp: string;
};

type Reminder = {
  id: string;
  title: string;
  datetime: string;
};

type Note = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
};

type GameItem = {
  id: string;
  name: string;
  note: string;
};

type LinkItem = {
  id: string;
  label: string;
  url: string;
};

type WatchItem = {
  id: string;
  title: string;
  note: string;
};

const defaultPhotos: PhotoSlot[] = [
  { id: "p1", label: "Polaroid #1" },
  { id: "p2", label: "Polaroid #2" },
  { id: "p3", label: "Polaroid #3" },
  { id: "p4", label: "Polaroid #4" },
  { id: "p5", label: "Polaroid #5" },
  { id: "p6", label: "Polaroid #6" },
];

const defaultMilestones: Milestone[] = [
  { id: "anniv", name: "Anniversary", date: "2026-02-14" },
];

const defaultAnime: WatchItem[] = [
  { id: "anime-1", title: "Frieren", note: "Cozy fantasy" },
  { id: "anime-2", title: "Spy x Family", note: "Lighthearted" },
];

const defaultMovies: WatchItem[] = [
  { id: "movie-1", title: "Your Name", note: "Romantic" },
  { id: "movie-2", title: "La La Land", note: "Music night" },
];

const PHOTO_STORAGE_KEY = "bunny-hub-photos";
const MILESTONE_STORAGE_KEY = "bunny-hub-milestones";
const THEME_STORAGE_KEY = "bunny-hub-theme";
const SUGGESTION_STORAGE_KEY = "bunny-hub-suggestions";
const REMINDER_STORAGE_KEY = "bunny-hub-reminders";
const NOTE_STORAGE_KEY = "bunny-hub-notes";
const GAME_STORAGE_KEY = "bunny-hub-games";
const LINK_STORAGE_KEY = "bunny-hub-links";
const ANIME_STORAGE_KEY = "bunny-hub-anime";
const MOVIE_STORAGE_KEY = "bunny-hub-movies";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const stripTime = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getDaysUntil = (dateString: string) => {
  const today = new Date();
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return null;

  const targetThisYear = new Date(today.getFullYear(), month - 1, day);
  const target =
    targetThisYear >= stripTime(today)
      ? targetThisYear
      : new Date(today.getFullYear() + 1, month - 1, day);

  const diffMs = target.getTime() - stripTime(today).getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const buildMonthGrid = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startOffset = firstDay.getDay();

  const cells: Array<{ day: number | null; date?: Date }> = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ day: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, date: new Date(year, month, day) });
  }
  return cells;
};

const getTimeUntil = (datetime: string) => {
  const target = new Date(datetime);
  if (Number.isNaN(target.getTime())) return "Pick a date";
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return "Past due";
  const minutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  const dayPart = days > 0 ? `${days}d ` : "";
  return `${dayPart}${hours}h ${mins}m left`;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");

  // Pet settings
  const [petEnabled, setPetEnabled] = useState(
    () => localStorage.getItem("pet-enabled") !== "0",
  );
  const [petType, setPetType] = useState<"bunny" | "cat">(
    () => (localStorage.getItem("pet-type") as "bunny" | "cat") || "bunny",
  );

  useEffect(() => {
    localStorage.setItem("pet-enabled", petEnabled ? "1" : "0");
  }, [petEnabled]);

  useEffect(() => {
    localStorage.setItem("pet-type", petType);
  }, [petType]);

  // Crimson Locket puzzle lock: only for a specific user by email
  const [locked, setLocked] = useState<boolean>(false);
  const [noSwapped, setNoSwapped] = useState(false);

  useEffect(() => {
    const targets = [
      "aaditirammohan9@gmail.com",
      "f20220263@dubai.bits-pilani.ac.in",
    ];
    const unlocked = !!localStorage.getItem("crimson-unlocked");
    const email = session?.user?.email?.toLowerCase() ?? "";
    if (targets.includes(email) && !unlocked) {
      setLocked(true);
    } else {
      setLocked(false);
    }
  }, [session]);

  const handleUnlock = () => {
    setLocked(false);
  };

  const handleYesInvite = () => {
    localStorage.setItem("crimson-unlocked", "1");
    handleUnlock();
  };

  useEffect(() => {
    document.body.style.overflow = locked ? "hidden" : "auto";
  }, [locked]);

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<PhotoSlot[]>(defaultPhotos);
  const [milestones, setMilestones] = useState<Milestone[]>(defaultMilestones);
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [theme, setTheme] = useState<"bunny" | "batman">("bunny");
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStatus, setChatStatus] = useState("");
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDateTime, setReminderDateTime] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [games, setGames] = useState<GameItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [newGameName, setNewGameName] = useState("");
  const [newGameNote, setNewGameNote] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [animeList, setAnimeList] = useState<WatchItem[]>(defaultAnime);
  const [movieList, setMovieList] = useState<WatchItem[]>(defaultMovies);
  const [newAnimeTitle, setNewAnimeTitle] = useState("");
  const [newAnimeNote, setNewAnimeNote] = useState("");
  const [newMovieTitle, setNewMovieTitle] = useState("");
  const [newMovieNote, setNewMovieNote] = useState("");

  const allowedEmails = useMemo(
    () => ALLOWED_EMAILS.map((value) => value.trim().toLowerCase()),
    [],
  );

  const isAllowed = session?.user?.email
    ? allowedEmails.includes(session.user.email.toLowerCase())
    : false;
  const chatWithLabel =
    session?.user?.email?.toLowerCase() === "aaditirammohan9@gmail.com"
      ? "Chat with Ishaan"
      : "Chat with Aditi";

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session && !isAllowed && supabase) {
      supabase.auth.signOut();
    }
  }, [isAllowed, session]);

  useEffect(() => {
    if (!supabase || !session) {
      setChatMessages([]);
      return;
    }

    let active = true;
    let timer: number | null = null;
    setChatStatus("");

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_email, message, created_at")
        .order("created_at", { ascending: true })
        .limit(200);
      if (!active) return;
      if (error) {
        setChatStatus("Unable to load messages.");
        return;
      }
      setChatMessages((data as ChatMessage[]) || []);
    };

    loadMessages();
    timer = window.setInterval(loadMessages, 4000);

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [session]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "batman" || savedTheme === "bunny") {
      setTheme(savedTheme);
    }

    const rawPhotos = window.localStorage.getItem(PHOTO_STORAGE_KEY);
    if (rawPhotos) {
      try {
        const parsed = JSON.parse(rawPhotos) as PhotoSlot[];
        if (Array.isArray(parsed)) {
          setPhotos(parsed);
        }
      } catch {
        // Ignore malformed storage
      }
    }
    const rawMilestones = window.localStorage.getItem(MILESTONE_STORAGE_KEY);
    if (rawMilestones) {
      try {
        const parsed = JSON.parse(rawMilestones) as Milestone[];
        if (Array.isArray(parsed)) {
          setMilestones(parsed);
        }
      } catch {
        // Ignore malformed storage
      }
    }
    const rawSuggestions = window.localStorage.getItem(SUGGESTION_STORAGE_KEY);
    if (rawSuggestions) {
      try {
        const parsed = JSON.parse(rawSuggestions) as Suggestion[];
        if (Array.isArray(parsed)) {
          setSuggestions(parsed);
        }
      } catch {
        // Ignore malformed storage
      }
    }
    const rawReminders = window.localStorage.getItem(REMINDER_STORAGE_KEY);
    if (rawReminders) {
      try {
        const parsed = JSON.parse(rawReminders) as Reminder[];
        if (Array.isArray(parsed)) {
          setReminders(parsed);
        }
      } catch {
        // Ignore malformed storage
      }
    }
    const rawNotes = window.localStorage.getItem(NOTE_STORAGE_KEY);
    if (rawNotes) {
      try {
        const parsed = JSON.parse(rawNotes) as Note[];
        if (Array.isArray(parsed)) {
          setNotes(parsed);
        }
      } catch {
        // Ignore malformed storage
      }
    }
    const rawGames = window.localStorage.getItem(GAME_STORAGE_KEY);
    if (rawGames) {
      try {
        const parsed = JSON.parse(rawGames) as GameItem[];
        if (Array.isArray(parsed)) {
          setGames(parsed);
        }
      } catch {
        // Ignore malformed storage
      }
    } else {
      setGames(
        defaultGames.map((game) => ({
          id: `${game.name}`.toLowerCase().replace(/\s+/g, "-"),
          name: game.name,
          note: game.note,
        })),
      );
    }

    const rawLinks = window.localStorage.getItem(LINK_STORAGE_KEY);
    if (rawLinks) {
      try {
        const parsed = JSON.parse(rawLinks) as LinkItem[];
        if (Array.isArray(parsed)) {
          setLinks(parsed);
        }
      } catch {
        // Ignore malformed storage
      }
    } else {
      setLinks(
        defaultLinks.map((link) => ({
          id: `${link.label}`.toLowerCase().replace(/\s+/g, "-"),
          label: link.label,
          url: link.url,
        })),
      );
    }

    const rawAnime = window.localStorage.getItem(ANIME_STORAGE_KEY);
    if (rawAnime) {
      try {
        const parsed = JSON.parse(rawAnime) as WatchItem[];
        if (Array.isArray(parsed)) {
          setAnimeList(parsed);
        }
      } catch {
        // Ignore malformed storage
      }
    }

    const rawMovies = window.localStorage.getItem(MOVIE_STORAGE_KEY);
    if (rawMovies) {
      try {
        const parsed = JSON.parse(rawMovies) as WatchItem[];
        if (Array.isArray(parsed)) {
          setMovieList(parsed);
        }
      } catch {
        // Ignore malformed storage
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(photos));
  }, [photos]);

  useEffect(() => {
    window.localStorage.setItem(
      MILESTONE_STORAGE_KEY,
      JSON.stringify(milestones),
    );
  }, [milestones]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(
      SUGGESTION_STORAGE_KEY,
      JSON.stringify(suggestions),
    );
  }, [suggestions]);

  useEffect(() => {
    window.localStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify(reminders),
    );
  }, [reminders]);

  useEffect(() => {
    window.localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    window.localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(games));
  }, [games]);

  useEffect(() => {
    window.localStorage.setItem(LINK_STORAGE_KEY, JSON.stringify(links));
  }, [links]);

  useEffect(() => {
    window.localStorage.setItem(ANIME_STORAGE_KEY, JSON.stringify(animeList));
  }, [animeList]);

  useEffect(() => {
    window.localStorage.setItem(MOVIE_STORAGE_KEY, JSON.stringify(movieList));
  }, [movieList]);

  const handleSignIn = async () => {
    setMessage("");
    if (!supabase) {
      setMessage("Supabase is not configured yet.");
      return;
    }
    if (!email) {
      setMessage("Enter your email to continue.");
      return;
    }
    if (!allowedEmails.includes(email.toLowerCase())) {
      setMessage("That email is not on the allowed list.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
    }
  };

  const handleMagicLink = async () => {
    setMessage("");
    if (!supabase) {
      setMessage("Supabase is not configured yet.");
      return;
    }
    if (!email) {
      setMessage("Enter your email to continue.");
      return;
    }
    if (!allowedEmails.includes(email.toLowerCase())) {
      setMessage("That email is not on the allowed list.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Magic link sent. Check your inbox.");
  };

  const handleSignUp = async () => {
    setMessage("");
    if (!supabase) {
      setMessage("Supabase is not configured yet.");
      return;
    }
    if (!email || !password) {
      setMessage("Email and password are required.");
      return;
    }
    if (!allowedEmails.includes(email.toLowerCase())) {
      setMessage("That email is not on the allowed list.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(
      "Account created. Check your email for confirmation if enabled.",
    );
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const handlePhotoUpload = (index: number, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setPhotos((prev) =>
        prev.map((slot, idx) =>
          idx === index ? { ...slot, imageUrl: result } : slot,
        ),
      );
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) =>
      prev.map((slot, idx) =>
        idx === index ? { ...slot, imageUrl: "" } : slot,
      ),
    );
  };

  const handleAddMilestone = () => {
    if (!milestoneName || !milestoneDate) return;
    const next: Milestone = {
      id: `${milestoneName}-${milestoneDate}`
        .toLowerCase()
        .replace(/\s+/g, "-"),
      name: milestoneName,
      date: milestoneDate,
    };
    setMilestones((prev) => [...prev, next]);
    setMilestoneName("");
    setMilestoneDate("");
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    if (!supabase || !session?.user?.email) {
      setChatStatus("Sign in to chat.");
      return;
    }
    const messageText = chatMessage.trim();
    setChatMessage("");
    setChatStatus("");
    const { error } = await supabase.from("messages").insert({
      sender_email: session.user.email,
      message: messageText,
    });
    if (error) {
      setChatStatus("Failed to send message.");
      setChatMessage(messageText);
    }
  };

  const handleAddSuggestion = () => {
    if (!suggestionText.trim()) return;
    const now = new Date();
    const next: Suggestion = {
      id: `${now.getTime()}`,
      text: suggestionText.trim(),
      timestamp: now.toLocaleDateString(),
    };
    setSuggestions((prev) => [next, ...prev]);
    setSuggestionText("");
  };

  const handleAddReminder = () => {
    if (!reminderTitle.trim() || !reminderDateTime) return;
    const next: Reminder = {
      id: `${reminderTitle}-${reminderDateTime}`
        .toLowerCase()
        .replace(/\s+/g, "-"),
      title: reminderTitle.trim(),
      datetime: reminderDateTime,
    };
    setReminders((prev) => [...prev, next]);
    setReminderTitle("");
    setReminderDateTime("");
  };

  const handleRemoveReminder = (id: string) => {
    setReminders((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddNote = () => {
    if (!noteTitle.trim() || !noteBody.trim()) return;
    const now = new Date().toLocaleString();
    const next: Note = {
      id: `${noteTitle}-${Date.now()}`.toLowerCase().replace(/\s+/g, "-"),
      title: noteTitle.trim(),
      body: noteBody.trim(),
      updatedAt: now,
    };
    setNotes((prev) => [next, ...prev]);
    setNoteTitle("");
    setNoteBody("");
  };

  const handleRemoveNote = (id: string) => {
    setNotes((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddGame = () => {
    if (!newGameName.trim()) return;
    const next: GameItem = {
      id: `${newGameName}-${Date.now()}`.toLowerCase().replace(/\s+/g, "-"),
      name: newGameName.trim(),
      note: newGameNote.trim(),
    };
    setGames((prev) => [...prev, next]);
    setNewGameName("");
    setNewGameNote("");
  };

  const handleRemoveGame = (id: string) => {
    setGames((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    const next: LinkItem = {
      id: `${newLinkLabel}-${Date.now()}`.toLowerCase().replace(/\s+/g, "-"),
      label: newLinkLabel.trim(),
      url: newLinkUrl.trim(),
    };
    setLinks((prev) => [...prev, next]);
    setNewLinkLabel("");
    setNewLinkUrl("");
  };

  const handleRemoveLink = (id: string) => {
    setLinks((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddAnime = () => {
    if (!newAnimeTitle.trim()) return;
    const next: WatchItem = {
      id: `${newAnimeTitle}-${Date.now()}`.toLowerCase().replace(/\s+/g, "-"),
      title: newAnimeTitle.trim(),
      note: newAnimeNote.trim(),
    };
    setAnimeList((prev) => [...prev, next]);
    setNewAnimeTitle("");
    setNewAnimeNote("");
  };

  const handleRemoveAnime = (id: string) => {
    setAnimeList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddMovie = () => {
    if (!newMovieTitle.trim()) return;
    const next: WatchItem = {
      id: `${newMovieTitle}-${Date.now()}`.toLowerCase().replace(/\s+/g, "-"),
      title: newMovieTitle.trim(),
      note: newMovieNote.trim(),
    };
    setMovieList((prev) => [...prev, next]);
    setNewMovieTitle("");
    setNewMovieNote("");
  };

  const handleRemoveMovie = (id: string) => {
    setMovieList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "bunny" ? "batman" : "bunny"));
  };

  const today = new Date();
  const monthGrid = buildMonthGrid(today);
  const monthLabel = today.toLocaleString("default", { month: "long" });
  const { pathname } = useLocation();
  const isSettings = pathname.startsWith("/settings");

  if (!hasSupabaseEnv) {
    return (
      <div className={`page ${locked ? "locked" : ""}`}>
        <div className="card hero">
          <p className="tag">Setup required</p>
          <h1>Bunny Hub</h1>
          <p className="subtitle">
            Add Supabase keys to <code>.env</code> to enable login.
          </p>
          <div className="callout">
            <p>Expected variables:</p>
            <ul>
              <li>VITE_SUPABASE_URL</li>
              <li>VITE_SUPABASE_ANON_KEY</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !isAllowed) {
    return (
      <div className={`page ${locked ? "locked" : ""}`}>
        <div className="card auth">
          <p className="tag">Private for two</p>
          <h1>Bunny Hub</h1>
          <p className="subtitle">
            A cozy corner for games, links, and memories.
          </p>
          <div className="form">
            <label>
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="��������"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </div>
          {message ? <p className="message">{message}</p> : null}
          <div className="actions">
            <button onClick={handleSignIn} disabled={loading}>
              Sign in
            </button>
            <button
              className="ghost"
              onClick={handleMagicLink}
              disabled={loading}
            >
              Send magic link
            </button>
            <button className="ghost" onClick={handleSignUp} disabled={loading}>
              Create account
            </button>
          </div>
          <p className="fine-print">
            Allowed emails: {ALLOWED_EMAILS.join(", ")}
          </p>
        </div>
      </div>
    );
  }

  if (isSettings) {
    return (
      <div className={`page ${locked ? "locked" : ""}`}>
        {locked ? (
          <div className="invite-overlay">
            <div className="invite-card">
              <h2>Will you be my Valentines?</h2>
              <p>Tap yes to accept the invitation.</p>
              <div className={`choice-wrap ${noSwapped ? "swapped" : ""}`}>
                <button type="button" className="yes" onClick={handleYesInvite}>
                  Yes
                </button>
                <button
                  type="button"
                  className="no secondary"
                  onClick={() => setNoSwapped((s) => !s)}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <header className="top">
          <div>
            <p className="tag">Preferences</p>
            <h1>Settings</h1>
            <p className="subtitle">Personalize your space.</p>
          </div>
          <div className="top-actions">
            <Link className="ghost link-button" to="/">
              Back
            </Link>
          </div>
        </header>
        <section className="grid">
          <Settings
            petEnabled={petEnabled}
            petType={petType}
            setPetEnabled={setPetEnabled}
            setPetType={setPetType}
          />
        </section>
        {petEnabled ? <Pet type={petType} hidden={!petEnabled} /> : null}
      </div>
    );
  }

  return (
    <div className={`page ${locked ? "locked" : ""}`}>
      {locked ? (
        <div className="invite-overlay">
          <div className="invite-card">
            <h2>Will you be my Valentines?</h2>
            <p>Tap yes to accept the invitation.</p>
            <div className={`choice-wrap ${noSwapped ? "swapped" : ""}`}>
              <button type="button" className="yes" onClick={handleYesInvite}>
                Yes
              </button>
              <button
                type="button"
                className="no secondary"
                onClick={() => setNoSwapped((s) => !s)}
              >
                No
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <header className="top">
        <div>
          <p className="tag">Welcome back</p>
          <h1>Bunny Hub</h1>
          <p className="subtitle">Your shared soft space.</p>
        </div>
        <div className="top-actions">
          <Link className="ghost link-button" to="/settings">
            Settings
          </Link>
          <button className="ghost" onClick={handleToggleTheme}>
            Theme: {theme === "bunny" ? "Bunny" : "Batman"}
          </button>
          <button className="ghost" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className="grid">
        <div className="card hero">
          <h2>Tonight's vibe</h2>
          <p>
            Pick a cozy co-op, drop a new link, or pin the cutest photo.
            Everything in one bunny-soft home base.
          </p>
          <div className="pill-row">
            <span>Snacks</span>
            <span>Candles</span>
            <span>Lo-fi</span>
          </div>
        </div>

        <div className="card">
          <h3>Games queue</h3>
          <div className="inline-form">
            <input
              type="text"
              placeholder="Game name"
              value={newGameName}
              onChange={(event) => setNewGameName(event.target.value)}
            />
            <input
              type="text"
              placeholder="Short note"
              value={newGameNote}
              onChange={(event) => setNewGameNote(event.target.value)}
            />
            <button type="button" onClick={handleAddGame}>
              Add
            </button>
          </div>
          <ul className="list">
            {games.map((game) => (
              <li key={game.id}>
                <strong>{game.name}</strong>
                <span>{game.note}</span>
                {editMode ? (
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => handleRemoveGame(game.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>Shared links</h3>
          <div className="inline-form">
            <input
              type="text"
              placeholder="Label"
              value={newLinkLabel}
              onChange={(event) => setNewLinkLabel(event.target.value)}
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={newLinkUrl}
              onChange={(event) => setNewLinkUrl(event.target.value)}
            />
            <button type="button" onClick={handleAddLink}>
              Add
            </button>
          </div>
          <ul className="list">
            {links.map((link) => (
              <li key={link.id}>
                <strong>{link.label}</strong>
                <a href={link.url} target="_blank" rel="noreferrer">
                  {link.url}
                </a>
                {editMode ? (
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => handleRemoveLink(link.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>Anime watchlist</h3>
          <div className="inline-form">
            <input
              type="text"
              placeholder="Anime title"
              value={newAnimeTitle}
              onChange={(event) => setNewAnimeTitle(event.target.value)}
            />
            <input
              type="text"
              placeholder="Notes"
              value={newAnimeNote}
              onChange={(event) => setNewAnimeNote(event.target.value)}
            />
            <button type="button" onClick={handleAddAnime}>
              Add
            </button>
          </div>
          <ul className="list">
            {animeList.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.note}</span>
                {editMode ? (
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => handleRemoveAnime(item.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>Movie watchlist</h3>
          <div className="inline-form">
            <input
              type="text"
              placeholder="Movie title"
              value={newMovieTitle}
              onChange={(event) => setNewMovieTitle(event.target.value)}
            />
            <input
              type="text"
              placeholder="Notes"
              value={newMovieNote}
              onChange={(event) => setNewMovieNote(event.target.value)}
            />
            <button type="button" onClick={handleAddMovie}>
              Add
            </button>
          </div>
          <ul className="list">
            {movieList.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.note}</span>
                {editMode ? (
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => handleRemoveMovie(item.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="card photo-card">
          <h3>Picture wall</h3>
          <div className="photo-grid">
            {photos.map((slot, index) => (
              <div key={slot.id} className="photo">
                {slot.imageUrl ? (
                  <img src={slot.imageUrl} alt={slot.label} />
                ) : (
                  <span>{slot.label}</span>
                )}
                <div className="photo-actions">
                  <label className="photo-upload">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handlePhotoUpload(index, event.target.files?.[0])
                      }
                    />
                  </label>
                  {slot.imageUrl && editMode ? (
                    <button
                      className="ghost"
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card calendar-card">
          <h3>Milestone calendar</h3>
          <p className="subtitle">Track anniversaries and sweet dates.</p>
          <div className="calendar">
            <div className="calendar-header">
              <strong>
                {monthLabel} {today.getFullYear()}
              </strong>
            </div>
            <div className="calendar-grid">
              {weekdayLabels.map((day) => (
                <span key={day} className="calendar-weekday">
                  {day}
                </span>
              ))}
              {monthGrid.map((cell, index) => {
                const iso = cell.date
                  ? `${cell.date.getFullYear()}-${String(
                      cell.date.getMonth() + 1,
                    ).padStart(2, "0")}-${String(cell.date.getDate()).padStart(
                      2,
                      "0",
                    )}`
                  : "";
                const hasMilestone = cell.date
                  ? milestones.some(
                      (item) => item.date.slice(5) === iso.slice(5),
                    )
                  : false;
                return (
                  <span
                    key={`${cell.day ?? "blank"}-${index}`}
                    className={`calendar-day${hasMilestone ? " is-marked" : ""}`}
                  >
                    {cell.day ?? ""}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="milestone-form">
            <input
              type="text"
              placeholder="Milestone name"
              value={milestoneName}
              onChange={(event) => setMilestoneName(event.target.value)}
            />
            <input
              type="date"
              value={milestoneDate}
              onChange={(event) => setMilestoneDate(event.target.value)}
            />
            <button type="button" onClick={handleAddMilestone}>
              Add milestone
            </button>
          </div>

          <ul className="list milestone-list">
            {milestones.map((item) => {
              const daysUntil = getDaysUntil(item.date);
              return (
                <li key={item.id}>
                  <strong>{item.name}</strong>
                  <span>{item.date}</span>
                  <span>
                    {daysUntil === null
                      ? "Date needed"
                      : `${daysUntil} day${daysUntil === 1 ? "" : "s"} away`}
                  </span>
                  {editMode ? (
                    <button
                      className="ghost"
                      type="button"
                      onClick={() => handleRemoveMilestone(item.id)}
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card chat-card">
          <h3>{chatWithLabel}</h3>
          <div className="chat-window">
            {chatMessages.map((messageItem) => (
              <div key={messageItem.id} className="chat-bubble">
                <div>
                  <strong>
                    {messageItem.sender_email === session?.user?.email
                      ? "You"
                      : chatWithLabel.replace("Chat with ", "")}
                  </strong>
                  <span className="chat-time">
                    {new Date(messageItem.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p>{messageItem.message}</p>
              </div>
            ))}
          </div>
          {chatStatus ? <p className="message">{chatStatus}</p> : null}
          <div className="chat-input">
            <input
              type="text"
              placeholder="Type a message..."
              value={chatMessage}
              onChange={(event) => setChatMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSendMessage();
                }
              }}
            />
            <button type="button" onClick={handleSendMessage}>
              Send
            </button>
          </div>
        </div>

        <div className="card suggestion-card">
          <h3>Suggestion box</h3>
          <p className="subtitle">Send a note to the developer.</p>
          <textarea
            placeholder="What should we build next?"
            value={suggestionText}
            onChange={(event) => setSuggestionText(event.target.value)}
          />
          <button type="button" onClick={handleAddSuggestion}>
            Submit suggestion
          </button>
          <ul className="list suggestion-list">
            {suggestions.map((item) => (
              <li key={item.id}>
                <strong>{item.text}</strong>
                <span>{item.timestamp}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card reminder-card">
          <h3>Reminders</h3>
          <p className="subtitle">Keep track of little tasks.</p>
          <div className="milestone-form">
            <input
              type="text"
              placeholder="Reminder title"
              value={reminderTitle}
              onChange={(event) => setReminderTitle(event.target.value)}
            />
            <input
              type="datetime-local"
              value={reminderDateTime}
              onChange={(event) => setReminderDateTime(event.target.value)}
            />
            <button type="button" onClick={handleAddReminder}>
              Add reminder
            </button>
          </div>
          <ul className="list reminder-list">
            {reminders.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <span>{new Date(item.datetime).toLocaleString()}</span>
                <span>{getTimeUntil(item.datetime)}</span>
                {editMode ? (
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => handleRemoveReminder(item.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="card notes-card">
          <h3>Notes</h3>
          <p className="subtitle">Shared thoughts and ideas.</p>
          <div className="notes-form">
            <input
              type="text"
              placeholder="Note title"
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
            />
            <textarea
              placeholder="Write your note..."
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
            />
            <button type="button" onClick={handleAddNote}>
              Add note
            </button>
          </div>
          <div className="notes-grid">
            {notes.map((item) => (
              <div key={item.id} className="note-card">
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <span className="note-time">Updated {item.updatedAt}</span>
                {editMode ? (
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => handleRemoveNote(item.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="edit-bar">
        <button
          className="ghost"
          type="button"
          onClick={() => setEditMode((value) => !value)}
        >
          {editMode ? "Done editing" : "Edit lists"}
        </button>
      </div>
      <div className="cat-station">
        <button id="cat-house" className="cat-spot" type="button">
          <span className="cat-spot-title">Cat house</span>
          <span className="cat-spot-sub">Drop the cat here</span>
        </button>
        <button id="cat-bowl" className="cat-spot" type="button">
          <span className="cat-spot-title">Feeding place</span>
          <span className="cat-spot-sub">Snack time</span>
        </button>
      </div>
      <Pet type={petType} hidden={!petEnabled} />
    </div>
  );
}
