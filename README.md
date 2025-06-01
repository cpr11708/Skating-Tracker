# Ice Dance Training Log

A modern web app for competitive ice dancers to log and track their training and lesson sessions. Features per-user authentication, session type and coach selection, focus area tagging, and a clean, responsive UI. Data is securely stored in Supabase, ensuring each user sees only their own sessions.

---

![Demo Screenshot](docs/demo-screenshot.png)
*_(Add a screenshot of your app in action)_*

---

## Features

- Log training and lesson sessions with date, duration, notes, and focus areas
- Select session type (practice/lesson), ice type, and coach
- Tag sessions with focus areas (checkboxes)
- Per-user authentication (Supabase Auth)
- All data stored securely in Supabase (Postgres)
- Edit and delete sessions with a modern modal UI
- Responsive, clean design with modern header and intuitive controls
- Recent sessions list with compact, informative cards

## Tech Stack

- HTML, CSS, JavaScript (Vanilla)
- [Supabase](https://supabase.com/) (Auth + Database)
- [Vercel](https://vercel.com/) for deployment

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ice-dance-training-log.git
cd ice-dance-training-log
```

### 2. Install Dependencies

This project is pure HTML/CSS/JS, so no build step is required. Optionally, use [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) for local development.

### 3. Supabase Setup

1. [Create a free Supabase project](https://app.supabase.com/)
2. Create a table named `sessions` with columns:
   - `id` (uuid, primary key, default: uuid_generate_v4())
   - `user_id` (uuid, foreign key to auth.users)
   - `date` (timestamp)
   - `duration` (integer, minutes)
   - `session_type` (text)
   - `ice_type` (text)
   - `coach` (text)
   - `focus_areas` (text[])
   - `notes` (text)
3. Enable Row Level Security (RLS) and add a policy:
   - Allow users to insert/select/update/delete their own sessions where `user_id = auth.uid()`
4. In your Supabase project, go to Project Settings > API and copy your `anon` public key and project URL.
5. In your project, update the Supabase client initialization in your JS file:

```js
const supabase = createClient('https://your-project.supabase.co', 'your-anon-key');
```

### 4. Run Locally

Open `index.html` in your browser, or use Live Server for hot reload.

### 5. Deploy with Vercel

1. Push your code to a GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Configure your project:
   - Framework Preset: Other
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: (leave empty)
5. Add your environment variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon/public key
6. Click Deploy

Vercel will automatically deploy your site and provide you with a URL. Each time you push changes to your repository, Vercel will automatically redeploy your site.

## Usage

- Log in or sign up with your email
- Add new sessions with the form
- View, edit, or delete recent sessions
- All data is private to your account

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE) 