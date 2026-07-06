(() => {
  "use strict";

  const STORAGE_KEY = "ourcv.resume.v1";
  const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

  const defaults = {
    version: 1,
    preferences: {
      layout: "classic",
      theme: "warm",
      density: 0,
      pages: 1,
      stale: false,
      hiddenSections: [],
      sectionOrder: ["work", "projects", "education"],
      editorialOrder: ["work", "education", "projects", "skills"],
      editorialSideWidth: 190
    },
    profile: {
      name: "你的姓名",
      title: "目标岗位 / 专业方向",
      phone: "138 0000 0000",
      email: "hello@example.com",
      city: "所在城市",
      website: "",
      tagline: "产品、AI 与复杂业务系统",
      summary: "用 2—3 句话概括你的专业方向、核心经验与最有说服力的成果。尽量具体，让招聘者快速理解你能解决什么问题。",
      portrait: "",
      footerText: "CREATED WITH OURCV"
    },
    work: [{
      company: "示例科技有限公司",
      period: "2023.06—至今",
      role: "产品经理｜业务平台",
      city: "上海",
      summary: "负责从需求研究到上线复盘的完整产品流程，与设计、研发和业务团队协作推进项目。",
      bullets: [
        "主导核心流程改版，将平均处理时长缩短 35%，季度活跃用户提升 20%。",
        "建立需求优先级与数据复盘机制，推动 12 项关键能力按期上线。"
      ]
    }],
    projects: [{
      name: "示例项目｜效率工具 0—1",
      period: "2024.01—2024.06",
      role: "项目负责人",
      city: "",
      summary: "一句话说明项目背景、你的职责以及最终结果。",
      bullets: [
        "通过用户访谈和数据分析定位关键问题，完成方案设计、验证与迭代。",
        "项目上线后覆盖 3 个业务团队，每周节省约 40 小时重复工作。"
      ]
    }],
    education: [{
      school: "示例大学",
      period: "2018.09—2022.06",
      degree: "专业名称｜本科",
      city: "所在城市",
      summary: ""
    }],
    highlights: [
      { value: "35%", label: "核心流程效率提升" },
      { value: "20%", label: "季度活跃用户增长" },
      { value: "12 项", label: "关键能力按期上线" }
    ],
    skills: [
      { name: "产品能力", items: "产品策略 · 用户研究 · 路线图 · 数据分析" },
      { name: "工作方法", items: "用户访谈 · 服务设计 · 实验验证 · 项目推进" },
      { name: "常用工具", items: "Figma · SQL · Notion · Jira · HTML/CSS" },
      { name: "语言", items: "中文 — 母语 · 英语 — 工作交流" }
    ]
  };

  const labels = {
    work: { title: "工作经历", add: "添加工作", empty: "还没有工作经历，点击右侧添加。" },
    projects: { title: "项目经历", add: "添加项目", empty: "还没有项目经历，点击右侧添加。" },
    education: { title: "教育经历", add: "添加教育", empty: "还没有教育经历，点击右侧添加。" }
  };

  const resume = document.querySelector("#resume");
  const status = document.querySelector("#saveStatus");
  const modeButton = document.querySelector("#modeButton");
  const modeLabel = document.querySelector("#modeLabel");
  const modeIcon = document.querySelector("#modeIcon");
  const portraitInput = document.querySelector("#portraitInput");
  const toast = document.querySelector("#toast");
  const exportMask = document.querySelector("#exportMask");
  const exportTitle = document.querySelector("#exportTitle");
  const exportDetail = document.querySelector("#exportDetail");
  const privacyLayer = document.querySelector("#privacyLayer");
  const privacyButton = document.querySelector("#privacyButton");
  const privacyCloseButton = document.querySelector("#privacyCloseButton");
  const backupInput = document.querySelector("#backupInput");
  const styleButton = document.querySelector("#styleButton");

  let state = loadState();
  const requestedLayout = new URLSearchParams(window.location.search).get("layout");
  if (requestedLayout === "classic" || requestedLayout === "editorial") {
    state.preferences.layout = requestedLayout;
  }
  let editing = true;
  let saveTimer = 0;
  let toastTimer = 0;
  let drawerReturnFocus = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeState(data) {
    if (!data || data.version !== 1 || typeof data.profile !== "object" || Array.isArray(data.profile)) {
      throw new Error("invalid schema");
    }
    const preferences = { ...defaults.preferences, ...(data.preferences || {}) };
    preferences.hiddenSections = Array.isArray(data.preferences?.hiddenSections)
      ? data.preferences.hiddenSections.filter(section => section === "projects" || section === "skills")
      : [];
    const defaultEditorialOrder = ["work", "education", "projects", "skills"];
    preferences.editorialOrder = Array.isArray(data.preferences?.editorialOrder) && data.preferences.editorialOrder.length === 4
      ? data.preferences.editorialOrder
      : defaultEditorialOrder;
    return {
      version: 1,
      preferences,
      profile: {
        ...defaults.profile,
        ...data.profile,
        tagline: typeof data.profile.tagline === "string" ? data.profile.tagline : "",
        footerText: typeof data.profile.footerText === "string"
          ? data.profile.footerText
          : defaults.profile.footerText
      },
      work: Array.isArray(data.work) ? data.work : [],
      projects: Array.isArray(data.projects) ? data.projects : [],
      education: Array.isArray(data.education) ? data.education : [],
      highlights: Array.isArray(data.highlights) ? data.highlights : [],
      skills: Array.isArray(data.skills) ? data.skills : []
    };
  }

  function blankState() {
    return normalizeState({
      version: 1,
      preferences: clone(defaults.preferences),
      profile: {
        name: "", title: "", phone: "", email: "", city: "", website: "",
        tagline: "", summary: "", portrait: "", footerText: defaults.profile.footerText
      },
      work: [],
      projects: [],
      education: [],
      highlights: [],
      skills: []
    });
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(defaults);
      return normalizeState(JSON.parse(raw));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return clone(defaults);
    }
  }

  function esc(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function editable(value, path, className, placeholder, tag = "div") {
    const attrs = editing
      ? ` contenteditable="true" spellcheck="false" data-path="${path}" data-placeholder="${esc(placeholder)}"`
      : "";
    return `<${tag} class="${className}"${attrs}>${esc(value)}</${tag}>`;
  }

  function optionalEditable(value, path, className, placeholder, tag = "div") {
    if (!editing && !String(value || "").trim()) return "";
    return editable(value, path, className, placeholder, tag);
  }

  function entryField(value, section, index, field, className, placeholder, tag = "span") {
    const attrs = editing
      ? ` contenteditable="true" spellcheck="false" data-section="${section}" data-index="${index}" data-field="${field}" data-placeholder="${esc(placeholder)}"`
      : "";
    return `<${tag} class="${className}"${attrs}>${esc(value)}</${tag}>`;
  }

  function renderHeader() {
    const p = state.profile;
    const contacts = [
      ["phone", p.phone, "电话"],
      ["email", p.email, "邮箱"],
      ["city", p.city, "城市"],
      ["website", p.website, "个人主页"]
    ];
    const visibleContacts = contacts.filter(([, value]) => editing || String(value || "").trim());
    const showPortrait = editing || Boolean(p.portrait);
    return `
      <header class="resume-header ${showPortrait ? "has-portrait" : ""}">
        <div class="identity">
          ${editable(p.name, "profile.name", "resume-name", "你的姓名", "h1")}
          ${optionalEditable(p.title, "profile.title", "resume-role", "目标岗位 / 专业方向")}
          ${visibleContacts.length ? `<div class="contact-line">
            ${visibleContacts.map(([key, value, hint]) => optionalEditable(value, `profile.${key}`, "", hint, "span")).join("")}
          </div>` : ""}
        </div>
        ${showPortrait ? `<div class="portrait-shell">
          ${p.portrait ? `<img src="${esc(p.portrait)}" alt="个人照片">` : `<div class="portrait-placeholder">照片</div>`}
          <button class="portrait-button edit-only" type="button" data-action="portrait">${p.portrait ? "更换" : "上传"}</button>
        </div>` : ""}
      </header>
      ${optionalEditable(p.summary, "profile.summary", "summary-box", "写一段精炼的个人介绍")}
    `;
  }

  function controls(section, index, count) {
    if (!editing) return "";
    return `
      <div class="entry-controls edit-only" aria-label="条目操作">
        <button class="icon-button" type="button" data-action="move-up" data-section="${section}" data-index="${index}" title="上移" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="icon-button" type="button" data-action="move-down" data-section="${section}" data-index="${index}" title="下移" ${index === count - 1 ? "disabled" : ""}>↓</button>
        <button class="icon-button" type="button" data-action="remove" data-section="${section}" data-index="${index}" title="删除">×</button>
      </div>
    `;
  }

  function renderBullets(item, section, index) {
    const bullets = Array.isArray(item.bullets) ? item.bullets : [];
    return `
      <ul>
        ${bullets.map((bullet, bulletIndex) => `
          <li>
            ${entryField(bullet, section, index, `bullets.${bulletIndex}`, "bullet-text", "描述行动与结果", "span")}
            ${editing ? `<button class="bullet-remove edit-only" type="button" data-action="remove-bullet" data-section="${section}" data-index="${index}" data-bullet="${bulletIndex}" title="删除此条">×</button>` : ""}
          </li>`).join("")}
      </ul>
      ${editing ? `<button class="bullet-add edit-only" type="button" data-action="add-bullet" data-section="${section}" data-index="${index}">＋ 添加成果描述</button>` : ""}
    `;
  }

  function renderExperience(item, section, index, count) {
    const first = section === "work" ? ["company", "公司 / 组织名称"] : ["name", "项目名称"];
    return `
      <article class="entry">
        <div class="entry-top">
          ${entryField(item[first[0]], section, index, first[0], "", first[1])}
          ${entryField(item.period, section, index, "period", "", "起止时间")}
        </div>
        <div class="entry-sub">
          ${entryField(item.role, section, index, "role", "", "职位 / 职责")}
          ${entryField(item.city, section, index, "city", "", "城市")}
        </div>
        ${entryField(item.summary, section, index, "summary", "entry-summary", "用一句话概括职责或项目背景", "p")}
        ${renderBullets(item, section, index)}
        ${controls(section, index, count)}
      </article>
    `;
  }

  function renderEducation(item, index, count) {
    return `
      <article class="entry education-grid">
        <div>
          <div class="education-main">
            ${entryField(item.school, "education", index, "school", "", "学校名称")}
            <span>｜</span>
            ${entryField(item.degree, "education", index, "degree", "", "专业｜学历")}
          </div>
          ${entryField(item.summary, "education", index, "summary", "entry-summary", "主修课程、荣誉或补充信息（可留空）", "p")}
        </div>
        <div class="education-meta">
          ${entryField(item.period, "education", index, "period", "", "起止时间", "div")}
          ${entryField(item.city, "education", index, "city", "", "城市", "div")}
        </div>
        ${controls("education", index, count)}
      </article>
    `;
  }

  function getSectionIndex(section) {
    const order = Array.isArray(state.preferences.sectionOrder) ? state.preferences.sectionOrder : ["work", "projects", "education"];
    return order.indexOf(section);
  }

  function canMoveSection(section, direction) {
    if (section !== "work" && section !== "projects") return false;
    const index = getSectionIndex(section);
    return direction === "up" ? index === 1 : index === 0;
  }

  function renderSection(section) {
    const items = state[section];
    const meta = labels[section];
    const hidden = state.preferences.hiddenSections.includes(section);
    if (hidden) {
      return editing ? `
        <div class="section-restore edit-only">
          <span>${meta.title}已从简历中移除</span>
          <button type="button" data-action="show-section" data-section="${section}">＋ 恢复${meta.title}</button>
        </div>
      ` : "";
    }
    return `
      <section class="resume-section">
        <div class="section-heading">
          <h2>${meta.title}</h2>
          ${editing ? `<button class="section-add edit-only" type="button" data-action="add" data-section="${section}">＋ ${meta.add}</button>` : ""}
          ${editing && (section === "work" || section === "projects") ? `<div class="section-move-controls edit-only">
            <button class="icon-button" type="button" data-action="move-section-up" data-section="${section}" title="上移栏目" ${canMoveSection(section, "up") ? "" : "disabled"}>↑</button>
            <button class="icon-button" type="button" data-action="move-section-down" data-section="${section}" title="下移栏目" ${canMoveSection(section, "down") ? "" : "disabled"}>↓</button>
          </div>` : ""}
          ${editing && section === "projects"
            ? `<button class="section-remove edit-only" type="button" data-action="hide-section" data-section="${section}" title="移除项目经历栏目">移除栏目</button>`
            : ""}
        </div>
        ${items.length
          ? items.map((item, index) => section === "education"
            ? renderEducation(item, index, items.length)
            : renderExperience(item, section, index, items.length)).join("")
          : `<p class="entry-summary">${meta.empty}</p>`}
      </section>
    `;
  }

  function editorialLabels() {
    const sample = [
      state.profile.name,
      state.profile.title,
      state.profile.tagline,
      state.profile.summary
    ].join("");
    const chinese = /[\u3400-\u9fff]/.test(sample);
    return chinese
      ? {
          profile: "个人简介",
          work: "工作经历",
          projects: "项目经历",
          education: "教育经历",
          skills: "能力工具"
        }
      : {
          profile: "Profile",
          work: "Experience",
          projects: "Selected Work",
          education: "Education",
          skills: "Toolkit"
        };
  }

  function editorialHeading(title, index, section = "") {
    const add = editing && section
      ? `<button class="editorial-add edit-only" type="button" data-action="add" data-section="${section}">＋ 添加</button>`
      : "";
    const canRemove = editing && (section === "projects" || section === "skills");
    const remove = canRemove
      ? `<button class="editorial-section-remove edit-only" type="button" data-action="hide-section" data-section="${section}" title="移除${title}栏目">移除栏目</button>`
      : "";
    return `
      <div class="editorial-heading" ${canRemove ? 'style="position:relative"' : ""}>
        <h2>${title}</h2><i></i>${add}${remove}
      </div>
    `;
  }

  function renderEditorialHeader(labels) {
    const p = state.profile;
    const contacts = [
      ["website", p.website, "WEB", "个人主页"],
      ["city", p.city, "BASED", "所在城市"],
      ["phone", p.phone, "PHONE", "电话"],
      ["email", p.email, "EMAIL", "邮箱"]
    ].filter(([, value]) => editing || String(value || "").trim());
    return `
      <header class="editorial-hero ${(editing || Boolean(p.portrait)) ? "has-portrait" : ""}">
        <div>
          ${optionalEditable(p.title, "profile.title", "editorial-eyebrow", "目标岗位 / 专业方向", "div")}
          ${editable(p.name, "profile.name", "editorial-name", "你的姓名", "h1")}
          ${optionalEditable(p.tagline, "profile.tagline", "editorial-tagline", "一句话描述你的专业定位", "div")}
        </div>
        ${contacts.length ? `<div class="editorial-contact">
          ${contacts.map(([key, value, label, placeholder]) => `
            <div>${optionalEditable(value, `profile.${key}`, "", placeholder, "span")}</div>
          `).join("")}
        </div>` : ""}
        ${(editing || Boolean(p.portrait)) ? `<div class="editorial-portrait-shell">
          ${p.portrait ? `<img src="${esc(p.portrait)}" alt="个人照片">` : `<div class="portrait-placeholder">照片</div>`}
          <button class="portrait-button edit-only" type="button" data-action="portrait">${p.portrait ? "更换" : "上传"}</button>
        </div>` : ""}
      </header>
      ${(editing || String(p.summary || "").trim()) ? `
        <section class="editorial-profile">
          <strong>${labels.profile}</strong>
          ${optionalEditable(p.summary, "profile.summary", "", "用 2—3 句话概括你的专业方向与成果", "p")}
        </section>` : ""}
    `;
  }

  function renderEditorialWork(labels) {
    const items = state.work;
    return `
      <section class="editorial-section editorial-work">
        ${editorialHeading(labels.work, 1, "work")}
        ${items.length ? items.map((item, index) => `
          <article class="entry editorial-timeline-entry">
            <div class="editorial-entry-head">
              ${entryField(item.role, "work", index, "role", "", "职位 / 职责", "h3")}
              ${entryField(item.period, "work", index, "period", "editorial-period", "起止时间")}
            </div>
            <div class="editorial-meta">
              ${entryField(item.company, "work", index, "company", "", "公司 / 组织")}
              ${optionalEditorialEntryField(item.city, "work", index, "city", "城市")}
            </div>
            ${optionalEditorialEntryField(item.summary, "work", index, "summary", "一句话概括职责", "p", "editorial-summary")}
            ${renderBullets(item, "work", index)}
            ${controls("work", index, items.length)}
          </article>
        `).join("") : `<p class="editorial-empty">还没有工作经历。</p>`}
      </section>
    `;
  }

  function optionalEditorialEntryField(value, section, index, field, placeholder, tag = "span", className = "") {
    if (!editing && !String(value || "").trim()) return "";
    return entryField(value, section, index, field, className, placeholder, tag);
  }

  function renderEditorialProjects(labels) {
    const items = state.projects;
    const hidden = state.preferences.hiddenSections.includes("projects");
    if (hidden) {
      return editing ? `
        <div class="section-restore edit-only">
          <span>${labels.projects}已从简历中移除</span>
          <button type="button" data-action="show-section" data-section="projects">＋ 恢复${labels.projects}</button>
        </div>
      ` : "";
    }
    return `
      <section class="editorial-section editorial-projects">
        ${editorialHeading(labels.projects, 2, "projects")}
        ${items.length ? items.map((item, index) => `
          <article class="entry editorial-project-card">
            <span class="editorial-project-no">${String(index + 1).padStart(2, "0")}</span>
            ${entryField(item.name, "projects", index, "name", "", "项目名称", "h3")}
            <div class="editorial-project-meta">
              ${optionalEditorialEntryField(item.role, "projects", index, "role", "项目角色")}
              ${optionalEditorialEntryField(item.period, "projects", index, "period", "起止时间")}
            </div>
            ${optionalEditorialEntryField(item.summary, "projects", index, "summary", "一句话说明项目背景与结果", "p", "editorial-summary")}
            ${renderBullets(item, "projects", index)}
            ${controls("projects", index, items.length)}
          </article>
        `).join("") : `<p class="editorial-empty">还没有项目经历。</p>`}
      </section>
    `;
  }

  function renderEditorialEducation(labels) {
    const items = state.education;
    return `
      <section class="editorial-section editorial-education">
        ${editorialHeading(labels.education, 3, "education")}
        ${items.length ? items.map((item, index) => `
          <article class="entry editorial-compact-entry">
            ${entryField(item.degree, "education", index, "degree", "", "专业｜学历", "h3")}
            ${entryField(item.school, "education", index, "school", "", "学校名称", "div")}
            <div>
              ${optionalEditorialEntryField(item.period, "education", index, "period", "起止时间")}
              ${optionalEditorialEntryField(item.city, "education", index, "city", "城市")}
            </div>
            ${optionalEditorialEntryField(item.summary, "education", index, "summary", "荣誉或补充信息", "p", "editorial-summary")}
            ${controls("education", index, items.length)}
          </article>
        `).join("") : `<p class="editorial-empty">还没有教育经历。</p>`}
      </section>
    `;
  }

  function renderEditorialSkills(labels) {
    const hidden = state.preferences.hiddenSections.includes("skills");
    if (hidden) {
      return editing ? `
        <div class="section-restore edit-only">
          <span>${labels.skills}已从简历中移除</span>
          <button type="button" data-action="show-section" data-section="skills">＋ 恢复${labels.skills}</button>
        </div>
      ` : "";
    }
    const indexed = state.skills
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => editing || String(item.name || item.items || "").trim());
    if (!editing && !indexed.length) return "";
    return `
      <section class="editorial-section editorial-skills">
        ${editorialHeading(labels.skills, 4, "skills")}
        ${indexed.map(({ item, index }) => `
          <article class="entry editorial-skill">
            ${entryField(item.name, "skills", index, "name", "", "能力分类", "strong")}
            ${entryField(item.items, "skills", index, "items", "", "能力、方法或工具", "p")}
            ${controls("skills", index, state.skills.length)}
          </article>
        `).join("")}
      </section>
    `;
  }

  function renderClassicResume() {
    const order = Array.isArray(state.preferences.sectionOrder) ? state.preferences.sectionOrder : ["work", "projects", "education"];
    const sections = { work: renderSection("work"), projects: renderSection("projects"), education: renderSection("education") };
    return `${renderHeader()}${order.map(key => sections[key] || "").join("")}`;
  }

  function renderEditorialFooter() {
    const value = state.profile.footerText;
    if (!editing && !String(value || "").trim()) return "";
    return `
      <footer class="editorial-footer">
        ${optionalEditable(value, "profile.footerText", "editorial-footer-credit", "输入自定义页脚（可留空）", "strong")}
      </footer>
    `;
  }

  function renderEditorialResume() {
    const labels = editorialLabels();
    return `
      ${renderEditorialHeader(labels)}
      <div class="editorial-grid">
        <div class="editorial-main">
          ${renderEditorialWork(labels)}
          ${renderEditorialEducation(labels)}
        </div>
        <aside class="editorial-side">
          <div class="editorial-divider-handle edit-only" data-action="drag-divider"></div>
          ${renderEditorialProjects(labels)}
          ${renderEditorialSkills(labels)}
        </aside>
      </div>
      ${renderEditorialFooter()}
    `;
  }

  function render() {
    state.preferences ||= clone(defaults.preferences);
    const layout = state.preferences.layout === "editorial" ? "editorial" : "classic";
    state.preferences.layout = layout;
    document.body.dataset.theme = state.preferences.theme;
    document.body.dataset.density = String(state.preferences.density || 0);
    document.body.dataset.layout = layout;
    resume.className = `resume-page layout-${layout}`;
    resume.innerHTML = layout === "editorial" ? renderEditorialResume() : renderClassicResume();
    if (layout === "editorial") {
      const sideWidth = state.preferences.editorialSideWidth || 190;
      const grid = resume.querySelector(".editorial-grid");
      if (grid) grid.style.gridTemplateColumns = `minmax(0, 1fr) ${sideWidth}px`;
    }
    document.body.classList.toggle("is-editing", editing);
    document.body.classList.toggle("is-saved", !editing);
    modeLabel.textContent = editing ? "保存" : "继续编辑";
    modeIcon.textContent = editing ? "✓" : "✎";
    document.querySelectorAll("[data-theme-choice]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.themeChoice === state.preferences.theme);
    });
    document.querySelectorAll("[data-layout-choice]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.layoutChoice === layout);
    });
    const pageStatus = document.querySelector("#pageStatus");
    if (pageStatus) {
      const densityNames = ["标准间距", "轻度紧凑", "紧凑排版", "高度紧凑", "极限排版"];
      pageStatus.textContent = state.preferences.stale
        ? "内容有变化，请重新排版"
        : `${state.preferences.pages || 1} 页 · ${densityNames[state.preferences.density || 0]}`;
    }
  }

  function markDirty() {
    state.preferences.stale = true;
    document.body.classList.add("is-dirty");
    status.textContent = "正在保存…";
    const pageStatus = document.querySelector("#pageStatus");
    if (pageStatus) pageStatus.textContent = "内容有变化，请重新排版";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 450);
  }

  function saveNow() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      document.body.classList.remove("is-dirty");
      status.textContent = "已保存在本机";
    } catch {
      status.textContent = "本机存储空间不足";
      showToast("保存失败：请尝试压缩或移除头像。", true);
    }
  }

  function showToast(message, isError = false) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("is-error", isError);
    toast.classList.add("is-visible");
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  function openPrivacyDrawer() {
    drawerReturnFocus = document.activeElement;
    privacyLayer.classList.add("is-open");
    privacyLayer.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-drawer-open");
    privacyCloseButton.focus();
  }

  function closePrivacyDrawer() {
    privacyLayer.classList.remove("is-open");
    privacyLayer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-drawer-open");
    drawerReturnFocus?.focus();
  }

  function backupFileName() {
    const date = new Date().toISOString().slice(0, 10);
    return `OurCV-本地备份-${date}.json`;
  }

  function downloadBackup() {
    saveNow();
    const payload = {
      product: "OurCV",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("本地备份已下载。");
  }

  function newItem(section) {
    if (section === "work") return { company: "公司 / 组织名称", period: "20XX.XX—20XX.XX", role: "职位｜职责方向", city: "城市", summary: "", bullets: ["写下你采取的行动和可量化的结果。"] };
    if (section === "projects") return { name: "项目名称", period: "20XX.XX—20XX.XX", role: "项目角色", city: "", summary: "一句话说明项目背景。", bullets: ["写下你的关键贡献和项目结果。"] };
    if (section === "education") return { school: "学校名称", period: "20XX.XX—20XX.XX", degree: "专业｜学历", city: "城市", summary: "" };
    if (section === "highlights") return { value: "XX%", label: "用一句话说明成果" };
    if (section === "skills") return { name: "能力分类", items: "能力一 · 能力二 · 能力三" };
    return {};
  }

  function setNested(target, path, value) {
    const parts = path.split(".");
    let cursor = target;
    for (let i = 0; i < parts.length - 1; i++) cursor = cursor[parts[i]];
    cursor[parts.at(-1)] = value;
  }

  resume.addEventListener("input", (event) => {
    const el = event.target.closest("[contenteditable]");
    if (!el) return;
    const value = el.innerText.replace(/\n{3,}/g, "\n\n").trimStart();
    if (el.dataset.path) {
      setNested(state, el.dataset.path, value);
    } else {
      const item = state[el.dataset.section]?.[Number(el.dataset.index)];
      if (item) setNested(item, el.dataset.field, value);
    }
    markDirty();
  });

  resume.addEventListener("keydown", (event) => {
    if (event.target.matches("[contenteditable]") && event.key === "Enter" && event.target.tagName !== "P" && !event.shiftKey) {
      event.preventDefault();
      event.target.blur();
    }
  });

  resume.addEventListener("mousedown", (event) => {
    const handle = event.target.closest("[data-action='drag-divider']");
    if (!handle) return;
    event.preventDefault();
    const grid = resume.querySelector(".editorial-grid");
    if (!grid) return;
    const gridRect = grid.getBoundingClientRect();
    const mainCol = grid.querySelector(".editorial-main");
    const startMainWidth = mainCol.getBoundingClientRect().width;
    const startMouseX = event.clientX;
    const gap = 33;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (e) => {
      const delta = e.clientX - startMouseX;
      const newMainWidth = startMainWidth + delta;
      const newSideWidth = gridRect.width - gap - newMainWidth;
      const clamped = Math.round(Math.max(120, Math.min(380, newSideWidth)));
      grid.style.gridTemplateColumns = `minmax(0, 1fr) ${clamped}px`;
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const currentMainWidth = mainCol.getBoundingClientRect().width;
      const finalSideWidth = Math.round(gridRect.width - gap - currentMainWidth);
      state.preferences.editorialSideWidth = Math.max(120, Math.min(380, finalSideWidth));
      markDirty();
      render();
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  resume.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "portrait") {
      portraitInput.click();
      return;
    }
    const section = button.dataset.section;
    if (action === "hide-section") {
      const sectionNames = { projects: "项目经历", skills: "能力工具" };
      if (!confirm(`确定移除${sectionNames[section] || "该"}栏目吗？栏目内容会保留，之后可以随时恢复。`)) return;
      if (!state.preferences.hiddenSections.includes(section)) {
        state.preferences.hiddenSections.push(section);
      }
      markDirty();
      render();
      return;
    }
    if (action === "show-section") {
      state.preferences.hiddenSections = state.preferences.hiddenSections.filter(item => item !== section);
      markDirty();
      render();
      return;
    }
    if (action === "move-section-up" || action === "move-section-down") {
      const order = state.preferences.sectionOrder || ["work", "projects", "education"];
      if (section !== "work" && section !== "projects") return;
      const idx = order.indexOf(section);
      const otherSection = section === "work" ? "projects" : "work";
      const otherIdx = order.indexOf(otherSection);
      if (idx < 0 || otherIdx < 0) return;
      const shouldMove = action === "move-section-up" ? idx > otherIdx : idx < otherIdx;
      if (!shouldMove) return;
      [order[idx], order[otherIdx]] = [order[otherIdx], order[idx]];
      state.preferences.sectionOrder = order;
      markDirty();
      render();
      return;
    }
    const index = Number(button.dataset.index);
    const items = state[section];
    if (!items) return;

    if (action === "add") items.push(newItem(section));
    if (action === "remove" && confirm("确定删除这条经历吗？")) items.splice(index, 1);
    if (action === "move-up" && index > 0) [items[index - 1], items[index]] = [items[index], items[index - 1]];
    if (action === "move-down" && index < items.length - 1) [items[index + 1], items[index]] = [items[index], items[index + 1]];
    if (action === "add-bullet") {
      items[index].bullets ||= [];
      items[index].bullets.push("补充一条行动与结果。");
    }
    if (action === "remove-bullet") items[index].bullets.splice(Number(button.dataset.bullet), 1);
    markDirty();
    render();
  });

  portraitInput.addEventListener("change", () => {
    const file = portraitInput.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return showToast("请选择 JPG、PNG 或 WebP 图片。", true);
    }
    if (file.size > MAX_IMAGE_BYTES) return showToast("图片请控制在 2MB 以内。", true);
    const reader = new FileReader();
    reader.onload = () => {
      state.profile.portrait = reader.result;
      markDirty();
      render();
      showToast("照片已放入简历，只保存在本机。");
    };
    reader.onerror = () => showToast("图片读取失败，请换一张重试。", true);
    reader.readAsDataURL(file);
    portraitInput.value = "";
  });

  modeButton.addEventListener("click", () => {
    editing = !editing;
    saveNow();
    render();
    showToast(editing ? "已回到编辑台。" : "已保存到本机，并进入预览状态。");
  });

  function closeStylePanel() {
    document.body.classList.remove("is-style-open");
    styleButton.setAttribute("aria-expanded", "false");
  }

  styleButton.addEventListener("click", () => {
    const open = document.body.classList.toggle("is-style-open");
    styleButton.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (event) => {
    if (document.body.classList.contains("is-style-open")
      && !event.target.closest("#styleDock")
      && !event.target.closest("#styleButton")) {
      closeStylePanel();
    }
    const layoutChoice = event.target.closest("[data-layout-choice]");
    if (layoutChoice) {
      state.preferences.layout = layoutChoice.dataset.layoutChoice;
      state.preferences.density = 0;
      state.preferences.pages = 1;
      state.preferences.stale = true;
      saveNow();
      render();
      closeStylePanel();
      showToast(`已切换为“${layoutChoice.textContent.replace(/\s+/g, " ").trim()}”模板。`);
      return;
    }
    const choice = event.target.closest("[data-theme-choice]");
    if (!choice) return;
    state.preferences.theme = choice.dataset.themeChoice;
    saveNow();
    render();
    closeStylePanel();
    showToast(`已切换为“${choice.textContent.trim()}”主题。`);
  });

  function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function fitPages() {
    const fitButton = document.querySelector("#fitButton");
    fitButton.disabled = true;
    const wasEditing = editing;
    const originalDensity = state.preferences.density || 0;
    editing = false;
    let match = null;
    let measuredHeight = 0;

    for (let pages = 1; pages <= 10 && !match; pages++) {
      for (let density = 0; density <= 4; density++) {
        state.preferences.density = density;
        render();
        await nextFrame();
        measuredHeight = resume.scrollHeight;
        if (measuredHeight <= 1123 * pages + 2) {
          match = { pages, density };
          break;
        }
      }
    }

    editing = wasEditing;
    fitButton.disabled = false;
    if (!match) {
      const chars = resume.textContent.replace(/\s/g, "").length;
      const ratio = Math.max(.05, 1 - (11230 / measuredHeight));
      const removeChars = Math.max(50, Math.ceil(chars * ratio / 50) * 50);
      state.preferences.density = originalDensity;
      render();
      showToast(`内容超过 10 页限制，请删除约 ${removeChars} 字或等量经历后重试。`, true);
      return;
    }

    state.preferences.pages = match.pages;
    state.preferences.density = match.density;
    state.preferences.stale = false;
    saveNow();
    render();
    showToast(match.pages === 1
      ? "已在美观范围内排成 1 页 A4。"
      : `内容不宜继续压缩，已自动排成 ${match.pages} 页 A4。`);
  }

  document.querySelector("#fitButton").addEventListener("click", fitPages);

  document.querySelector("#resetButton").addEventListener("click", () => {
    if (!confirm("这会清空当前内容并恢复示例，确定继续吗？")) return;
    state = clone(defaults);
    editing = true;
    saveNow();
    render();
    showToast("已恢复隐私安全的示例内容。");
  });

  privacyButton.addEventListener("click", openPrivacyDrawer);
  privacyCloseButton.addEventListener("click", closePrivacyDrawer);
  document.querySelector("#privacyScrim").addEventListener("click", closePrivacyDrawer);
  document.querySelector("#downloadBackupButton").addEventListener("click", downloadBackup);
  document.querySelector("#importBackupButton").addEventListener("click", () => backupInput.click());
  document.querySelector("#clearResumeButton").addEventListener("click", () => {
    if (!confirm("这会永久清除当前浏览器中的简历内容和照片，且无法撤销。确定继续吗？")) return;
    clearTimeout(saveTimer);
    localStorage.removeItem(STORAGE_KEY);
    state = blankState();
    editing = true;
    render();
    closePrivacyDrawer();
    status.textContent = "本机简历已清除";
    showToast("本机简历内容和照片已清除。");
  });

  backupInput.addEventListener("change", () => {
    const file = backupInput.files?.[0];
    backupInput.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return showToast("备份文件超过 8MB，请确认文件是否正确。", true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const imported = normalizeState(parsed?.product === "OurCV" ? parsed.data : parsed);
        if (!confirm("导入会覆盖当前简历，确定继续吗？")) return;
        state = imported;
        editing = true;
        saveNow();
        render();
        closePrivacyDrawer();
        showToast("备份已从本机导入。");
      } catch {
        showToast("无法识别该备份文件，请选择由 OurCV 导出的 JSON 文件。", true);
      }
    };
    reader.onerror = () => showToast("备份文件读取失败，请重试。", true);
    reader.readAsText(file, "utf-8");
  });

  function fileName(extension) {
    const name = (state.profile.name || "我的简历").replace(/[\\/:*?"<>|]/g, "").trim();
    return `${name || "我的简历"}-OurCV.${extension}`;
  }

  function setExporting(active, title = "", detail = "") {
    document.body.classList.toggle("is-exporting", active);
    exportMask.classList.toggle("is-visible", active);
    exportMask.setAttribute("aria-hidden", String(!active));
    if (title) exportTitle.textContent = title;
    if (detail) exportDetail.textContent = detail;
    document.querySelectorAll("#pdfButton, #pngButton, #fitButton").forEach(btn => { btn.disabled = active; });
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadFromFallbacks(test, urls) {
    if (test()) return;
    for (const url of urls) {
      try {
        await loadScript(url);
        if (test()) return;
      } catch { /* try next CDN */ }
    }
    throw new Error("资源加载失败");
  }

  async function ensureExportLibraries(needPdf = false) {
    await loadFromFallbacks(
      () => typeof window.html2canvas === "function",
      ["assets/vendor/html2canvas-1.4.1.min.js"]
    );
    if (needPdf) {
      await loadFromFallbacks(
        () => Boolean(window.jspdf?.jsPDF),
        ["assets/vendor/jspdf-2.5.1.umd.min.js"]
      );
    }
  }

  async function captureResume() {
    const wasEditing = editing;
    editing = false;
    render();
    await document.fonts?.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const paperColor = getComputedStyle(resume).backgroundColor || "#fffefa";
    const canvas = await window.html2canvas(resume, {
      backgroundColor: paperColor,
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      useCORS: true,
      logging: false,
      windowWidth: resume.scrollWidth,
      windowHeight: resume.scrollHeight
    });
    editing = wasEditing;
    render();
    return canvas;
  }

  document.querySelector("#pngButton").addEventListener("click", async () => {
    setExporting(true, "正在生成 PNG", "首次使用可能需要几秒加载导出组件");
    try {
      await ensureExportLibraries(false);
      const canvas = await captureResume();
      const link = document.createElement("a");
      link.download = fileName("png");
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("PNG 已生成。");
    } catch {
      showToast("PNG 组件加载失败，请检查网络后重试。", true);
    } finally {
      setExporting(false);
    }
  });

  document.querySelector("#pdfButton").addEventListener("click", async () => {
    setExporting(true, "正在生成 PDF", "将按 A4 页面自动分页");
    try {
      await ensureExportLibraries(true);
      const canvas = await captureResume();
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageWidth = 210;
      const pageHeight = 297;
      const imageHeight = canvas.height * pageWidth / canvas.width;
      const image = canvas.toDataURL("image/jpeg", .96);
      let y = 0;
      let remaining = imageHeight;
      pdf.addImage(image, "JPEG", 0, y, pageWidth, imageHeight, undefined, "FAST");
      remaining -= pageHeight;
      while (remaining > 0) {
        y = remaining - imageHeight;
        pdf.addPage();
        pdf.addImage(image, "JPEG", 0, y, pageWidth, imageHeight, undefined, "FAST");
        remaining -= pageHeight;
      }
      pdf.save(fileName("pdf"));
      showToast("PDF 已生成。");
    } catch {
      setExporting(false);
      showToast("自动导出组件加载失败，已打开系统打印，可选择“另存为 PDF”。", true);
      const wasEditing = editing;
      editing = false;
      render();
      setTimeout(() => {
        window.print();
        editing = wasEditing;
        render();
      }, 80);
      return;
    } finally {
      setExporting(false);
    }
  });

  window.addEventListener("beforeunload", saveNow);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("is-style-open")) {
      closeStylePanel();
      return;
    }
    if (event.key === "Escape" && privacyLayer.classList.contains("is-open")) {
      closePrivacyDrawer();
      return;
    }
    if (event.key === "Escape" && !editing) {
      editing = true;
      render();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveNow();
      showToast("已保存在本机。");
    }
  });

  render();
})();
