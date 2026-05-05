# AutoScriptorX 📝

**AutoScriptorX** is a premium, AI-powered manuscript processing studio designed for researchers and academics. It transforms raw documents into professionally formatted manuscripts ready for publication in major journals like IEEE, Springer, and APA.

![AutoScriptorX Preview](https://images.unsplash.com/photo-1456324504439-39765bca0c71?auto=format&fit=crop&q=80&w=2070)

## ✨ Features

- **Instant Manuscript Studio**: Upload a DOCX and see it transformed into a live academic preview.
- **Dynamic Formatting**:
  - **Font Control**: Choose from a curated list of academic fonts (Times New Roman, Arial, Inter, etc.).
  - **Fluid Scaling**: Adjust font sizes (10pt - 16pt) with real-time preview updates.
  - **Decorative Borders**: Toggle professional double-line page borders for formal submissions.
- **Academic Templates**:
  - **IEEE Conference**: Automatic two-column layout with numbered references.
  - **Springer LNCS**: Formal single-column layout with compact spacing.
  - **APA 7th Edition**: Double-spaced manuscript layout with ragged-right alignment and indents.
- **Advanced Processing**:
  - **Figure Detection**: Automatically identifies and embeds figures from your source document.
  - **Table Optimization**: Robust table rendering that prevents overflow and maintains column integrity.
  - **One-Click Export**: Download publication-ready **.DOCX** and **.PDF** files with all your custom settings preserved.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Sahithi1346/AutoScriptorX.git
   cd AutoScriptorX
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## 🛠️ Technology Stack

- **Frontend**: React 19, Tailwind CSS 4, Framer Motion
- **Routing**: TanStack Router
- **Parsing**: Mammoth.js (DOCX parsing)
- **Generation**: `docx` library (DOCX export), `jsPDF` (PDF export)
- **Icons**: Lucide React

## 📖 How to Use

1. **Upload**: Drag and drop your manuscript (.docx) into the studio.
2. **Configure**: Use the right sidebar to select a template and adjust font settings.
3. **Preview**: Watch the live preview on the left to see how your paper will look.
4. **Download**: Once satisfied, hit the Download button to get your formatted file.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for the Academic Community.
