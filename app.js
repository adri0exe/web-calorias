const config = window.CALORIE_APP_CONFIG || {};
const isConfigured = Boolean(
  config.SUPABASE_URL &&
    config.SUPABASE_ANON_KEY &&
    !config.SUPABASE_URL.includes("PON_AQUI") &&
    !config.SUPABASE_ANON_KEY.includes("PON_AQUI")
);

const supabaseClient = isConfigured
  ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  : null;

const state = {
  user: null,
  profile: null,
  foods: [],
  drinks: [],
  exercises: [],
  meals: [],
  drinkEntries: [],
  exerciseEntries: [],
  weights: []
};

const $ = (selector) => document.querySelector(selector);
const todayISO = () => new Date().toISOString().slice(0, 10);
const round = (value) => Math.round(Number(value) || 0);
const fmtKcal = (value) => `${round(value).toLocaleString("es-ES")} kcal`;
const fmtKg = (value) => `${Number(value || 0).toLocaleString("es-ES", { maximumFractionDigits: 1 })} kg`;

const els = {
  setupWarning: $("#setup-warning"),
  authView: $("#auth-view"),
  appView: $("#app-view"),
  greeting: $("#greeting"),
  userEmail: $("#user-email"),
  logoutButton: $("#logout-button"),
  authForm: $("#auth-form"),
  authMessage: $("#auth-message"),
  currentDate: $("#current-date"),
  currentDateDisplay: $("#current-date-display"),
  weightDate: $("#weight-date"),
  mealsDate: $("#meals-date"),
  foodSearch: $("#food-search"),
  foodOptions: $("#food-options"),
  foodGrams: $("#food-grams"),
  foodPreview: $("#food-preview"),
  mealType: $("#meal-type"),
  mealFoods: $("#meal-foods"),
  addFoodLine: $("#add-food-line"),
  mealForm: $("#meal-form"),
  mealsTimeline: $("#meals-timeline"),
  refreshMeals: $("#refresh-meals"),
  drinkSearch: $("#drink-search"),
  drinkOptions: $("#drink-options"),
  drinkMl: $("#drink-ml"),
  drinkPreview: $("#drink-preview"),
  drinkForm: $("#drink-form"),
  exerciseSearch: $("#exercise-search"),
  exerciseOptions: $("#exercise-options"),
  exerciseMinutes: $("#exercise-minutes"),
  exercisePreview: $("#exercise-preview"),
  exerciseForm: $("#exercise-form"),
  exerciseList: $("#exercise-list"),
  age: $("#age"),
  displayName: $("#display-name"),
  sex: $("#sex"),
  height: $("#height"),
  weight: $("#weight"),
  activityLevel: $("#activity-level"),
  goal: $("#goal"),
  targetPreview: $("#target-preview"),
  profileForm: $("#profile-form"),
  weightForm: $("#weight-form"),
  weightValue: $("#weight-value"),
  toggleWeightList: $("#toggle-weight-list"),
  weightList: $("#weight-list"),
  refreshHistory: $("#refresh-history"),
  weightChart: $("#weight-chart"),
  weightChartEmpty: $("#weight-chart-empty"),
  burnedChart: $("#burned-chart"),
  burnedChartEmpty: $("#burned-chart-empty"),
  consumedChart: $("#consumed-chart"),
  consumedChartEmpty: $("#consumed-chart-empty"),
  mealTypeChart: $("#meal-type-chart"),
  mealTypeDays: $("#meal-type-days"),
  mealTypeChartEmpty: $("#meal-type-chart-empty"),
  catalogFoodForm: $("#catalog-food-form"),
  catalogFoodId: $("#catalog-food-id"),
  catalogFoodName: $("#catalog-food-name"),
  catalogFoodCalories: $("#catalog-food-calories"),
  catalogFoodProtein: $("#catalog-food-protein"),
  catalogFoodCarbs: $("#catalog-food-carbs"),
  catalogFoodFat: $("#catalog-food-fat"),
  catalogFoodPublicLabel: $("#catalog-food-public-label"),
  catalogFoodPublic: $("#catalog-food-public"),
  saveCatalogFood: $("#save-catalog-food"),
  cancelFoodEdit: $("#cancel-food-edit"),
  toggleFoodCatalog: $("#toggle-food-catalog"),
  catalogFoodList: $("#catalog-food-list"),
  catalogDrinkForm: $("#catalog-drink-form"),
  catalogDrinkId: $("#catalog-drink-id"),
  catalogDrinkName: $("#catalog-drink-name"),
  catalogDrinkCalories: $("#catalog-drink-calories"),
  catalogDrinkPublicLabel: $("#catalog-drink-public-label"),
  catalogDrinkPublic: $("#catalog-drink-public"),
  saveCatalogDrink: $("#save-catalog-drink"),
  cancelDrinkEdit: $("#cancel-drink-edit"),
  toggleDrinkCatalog: $("#toggle-drink-catalog"),
  catalogDrinkList: $("#catalog-drink-list"),
  catalogExerciseForm: $("#catalog-exercise-form"),
  catalogExerciseId: $("#catalog-exercise-id"),
  catalogExerciseName: $("#catalog-exercise-name"),
  catalogExerciseMet: $("#catalog-exercise-met"),
  catalogExercisePublicLabel: $("#catalog-exercise-public-label"),
  catalogExercisePublic: $("#catalog-exercise-public"),
  saveCatalogExercise: $("#save-catalog-exercise"),
  cancelExerciseEdit: $("#cancel-exercise-edit"),
  toggleExerciseCatalog: $("#toggle-exercise-catalog"),
  catalogExerciseList: $("#catalog-exercise-list")
};

function init() {
  moveEntryFormsToMeals();
  els.currentDate.value = todayISO();
  els.weightDate.value = todayISO();
  els.mealsDate.value = todayISO();
  renderCurrentDateDisplay();
  els.setupWarning.classList.toggle("hidden", isConfigured);
  bindEvents();

  if (!isConfigured) {
    els.authMessage.textContent = "Crea el proyecto en Supabase y pega tus claves en config.js.";
    return;
  }

  supabaseClient.auth.getSession().then(({ data }) => {
    state.user = data.session?.user || null;
    renderSession();
    if (state.user) loadAll();
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;
    renderSession();
    if (state.user) loadAll();
  });

  window.addEventListener("resize", () => {
    if (state.user && $("#history").classList.contains("active")) renderHistory();
  });

  let scrollTimeout;
  window.addEventListener("scroll", () => {
    clearTimeout(scrollTimeout);
  }, { passive: true });
}

function bindEvents() {
  document.querySelectorAll(".bottom-nav .tab").forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });
  document.querySelectorAll("[data-entry-target]").forEach((card) => {
    card.addEventListener("click", () => goToEntryForm(card.dataset.entryTarget));
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      goToEntryForm(card.dataset.entryTarget);
    });
  });
  els.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await signIn();
  });
  els.logoutButton?.addEventListener("click", () => supabaseClient.auth.signOut());
  els.currentDate.addEventListener("change", () => {
    els.mealsDate.value = els.currentDate.value;
    renderCurrentDateDisplay();
    loadDay();
  });
  els.currentDateDisplay.addEventListener("click", () => {
    if (typeof els.currentDate.showPicker === "function") {
      els.currentDate.showPicker();
      return;
    }
    els.currentDate.focus();
  });
  els.foodSearch.addEventListener("input", updateFoodPreview);
  els.foodGrams.addEventListener("input", updateFoodPreview);
  els.mealFoods.addEventListener("input", updateFoodPreview);
  els.mealFoods.addEventListener("change", updateFoodPreview);
  els.mealFoods.addEventListener("click", handleMealFoodsClick);
  els.mealFoods.addEventListener("focusin", handleAutocompleteFocus);
  els.mealFoods.addEventListener("input", handleAutocompleteInput);
  els.addFoodLine.addEventListener("click", () => addMealFoodRow());
  els.drinkSearch.addEventListener("input", updateDrinkPreview);
  els.drinkSearch.addEventListener("focus", handleAutocompleteFocus);
  els.drinkSearch.addEventListener("input", handleAutocompleteInput);
  els.drinkMl.addEventListener("input", updateDrinkPreview);
  els.exerciseSearch.addEventListener("input", updateExercisePreview);
  els.exerciseSearch.addEventListener("focus", handleAutocompleteFocus);
  els.exerciseSearch.addEventListener("input", handleAutocompleteInput);
  els.exerciseMinutes.addEventListener("input", updateExercisePreview);
  els.mealForm.addEventListener("submit", saveMeal);
  els.drinkForm.addEventListener("submit", saveDrink);
  els.exerciseForm.addEventListener("submit", saveExercise);
  els.profileForm.addEventListener("input", renderTargetPreview);
  els.profileForm.addEventListener("submit", saveProfile);
  els.weightForm.addEventListener("submit", saveWeight);
  els.toggleWeightList.addEventListener("click", toggleWeightList);
  els.refreshHistory.addEventListener("click", loadAll);
  els.mealsDate.addEventListener("change", renderMealsTimeline);
  els.refreshMeals.addEventListener("click", renderMealsTimeline);
  els.catalogFoodForm.addEventListener("submit", saveCatalogFood);
  els.catalogDrinkForm.addEventListener("submit", saveCatalogDrink);
  els.catalogExerciseForm.addEventListener("submit", saveCatalogExercise);
  els.cancelFoodEdit.addEventListener("click", resetCatalogFoodForm);
  els.cancelDrinkEdit.addEventListener("click", resetCatalogDrinkForm);
  els.cancelExerciseEdit.addEventListener("click", resetCatalogExerciseForm);
  els.toggleFoodCatalog.addEventListener("click", () => toggleCatalogList("food"));
  els.toggleDrinkCatalog.addEventListener("click", () => toggleCatalogList("drink"));
  els.toggleExerciseCatalog.addEventListener("click", () => toggleCatalogList("exercise"));
  document.addEventListener("click", closeAutocompleteOnOutsideClick);
}

function moveEntryFormsToMeals() {
  const forms = $("#entry-forms");
  const target = $("#meals-entry-forms");
  if (!forms || !target || target.contains(forms)) return;
  target.appendChild(forms);
}

function activateTab(tabName) {
  const nav = document.querySelector(".bottom-nav");
  const tabs = Array.from(nav?.querySelectorAll(".tab") || []);
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  const activeIndex = Math.max(tabs.findIndex((tab) => tab.dataset.tab === tabName), 0);
  nav?.style.setProperty("--active-tab-index", activeIndex);
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tabName));
  if (tabName === "meals" && state.user) renderMealsTimeline();
  if (tabName === "history" && state.user) requestAnimationFrame(renderHistory);
}

function goToEntryForm(type) {
  const targets = {
    meal: { panel: "#meal-entry-panel", field: "#food-search" },
    drink: { panel: "#drink-entry-panel", field: "#drink-search" },
    exercise: { panel: "#exercise-entry-panel", field: "#exercise-search" }
  };
  const target = targets[type];
  if (!target) return;
  activateTab("meals");
  requestAnimationFrame(() => {
    const panel = $(target.panel);
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => $(target.field)?.focus({ preventScroll: true }), 280);
  });
}

async function signIn(options = {}) {
  const messageEl = options.messageEl || els.authMessage;
  messageEl.textContent = "";
  const email = options.email || $("#auth-email").value.trim();
  const password = options.password || $("#auth-password").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  messageEl.textContent = error ? error.message : "";
}

function renderSession() {
  const logged = Boolean(state.user);
  els.authView.classList.toggle("hidden", logged);
  els.appView.classList.toggle("hidden", !logged);
  els.logoutButton?.classList.toggle("hidden", !logged);
  if (els.userEmail) els.userEmail.textContent = state.user?.email || "";
  renderGreeting();
}

function renderGreeting() {
  const name = getUserDisplayName();
  els.greeting.textContent = name ? `👋 Hola, ${name}` : "👋 Hola";
}

function getUserDisplayName() {
  const profileName = String(state.profile?.display_name || "").trim();
  if (profileName) return profileName;
  const emailName = String(state.user?.email || "").split("@")[0].trim();
  return emailName || "";
}

function isAdmin() {
  return state.profile?.is_admin === true;
}

function canEditCatalogItem(item) {
  return item.user_id === state.user.id || (item.is_public === true && isAdmin());
}

async function loadAll() {
  await loadProfile();
  await Promise.all([loadCatalogs(), loadWeights()]);
  await loadDay();
  renderProfileForm();
  renderMealsTimeline();
  renderHistory();
}

async function loadProfile() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .maybeSingle();
  if (error) return showError(error);
  state.profile = data;
  renderGreeting();
}

async function loadCatalogs() {
  const [foodsResult, drinksResult, exercisesResult] = await Promise.all([
    supabaseClient.from("foods").select("*").or(`is_public.eq.true,user_id.eq.${state.user.id}`).order("name"),
    supabaseClient.from("drinks").select("*").or(`is_public.eq.true,user_id.eq.${state.user.id}`).order("name"),
    supabaseClient.from("exercise_catalog").select("*").or(`is_public.eq.true,user_id.eq.${state.user.id}`).order("name")
  ]);
  if (foodsResult.error) return showError(foodsResult.error);
  if (drinksResult.error) return showError(drinksResult.error);
  if (exercisesResult.error) return showError(exercisesResult.error);
  state.foods = foodsResult.data || [];
  state.drinks = drinksResult.data || [];
  state.exercises = exercisesResult.data || [];
  renderDatalists();
  renderCatalogs();
}

async function loadDay() {
  const date = els.currentDate.value || todayISO();
  const [mealsResult, drinksResult, exercisesResult] = await Promise.all([
    supabaseClient.from("meal_entries").select("*, foods(name, protein_per_100g, carbs_per_100g, fat_per_100g), meal_groups(id, meal_type, created_at)").eq("user_id", state.user.id).eq("entry_date", date).order("created_at"),
    supabaseClient.from("drink_entries").select("*, drinks(name)").eq("user_id", state.user.id).eq("entry_date", date).order("created_at"),
    supabaseClient.from("exercise_entries").select("*, exercise_catalog(name)").eq("user_id", state.user.id).eq("entry_date", date).order("created_at")
  ]);
  if (mealsResult.error) return showError(mealsResult.error);
  if (drinksResult.error) return showError(drinksResult.error);
  if (exercisesResult.error) return showError(exercisesResult.error);
  state.meals = mealsResult.data || [];
  state.drinkEntries = drinksResult.data || [];
  state.exerciseEntries = exercisesResult.data || [];
  renderDay();
  if ($("#meals").classList.contains("active")) renderMealsTimeline();
  renderHistory();
}

async function loadWeights() {
  const { data, error } = await fetchAllRows((from, to) => supabaseClient
    .from("weight_entries")
    .select("*")
    .eq("user_id", state.user.id)
    .order("entry_date", { ascending: false })
    .range(from, to));
  if (error) return showError(error);
  state.weights = data || [];
  renderWeights();
}

async function fetchAllRows(buildQuery, pageSize = 1000) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) return { data: rows, error };
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
    from += pageSize;
  }
}

function renderDatalists() {
  els.foodOptions.innerHTML = state.foods.map((food) => `<option value="${escapeHtml(food.name)}"></option>`).join("");
  els.drinkOptions.innerHTML = state.drinks.map((drink) => `<option value="${escapeHtml(drink.name)}"></option>`).join("");
  els.exerciseOptions.innerHTML = state.exercises.map((exercise) => `<option value="${escapeHtml(exercise.name)}"></option>`).join("");
}

function renderCatalogs() {
  els.catalogFoodPublicLabel.classList.toggle("hidden", !isAdmin());
  els.catalogDrinkPublicLabel.classList.toggle("hidden", !isAdmin());
  els.catalogExercisePublicLabel.classList.toggle("hidden", !isAdmin());
  updateCatalogToggle("food");
  updateCatalogToggle("drink");
  updateCatalogToggle("exercise");

  els.catalogFoodList.innerHTML = state.foods.map((food) => {
    const editable = canEditCatalogItem(food);
    const label = food.is_public ? "Público" : "Propio";
    return `
      <li>
        <div class="entry-main">
          <strong>${escapeHtml(food.name)}</strong>
          <span>${food.calories_per_100g} kcal/100 g - ${label}</span>
        </div>
        <div class="entry-actions">
          <button class="secondary" type="button" data-edit-food="${food.id}" ${editable ? "" : "disabled"}>Editar</button>
          <button class="danger" type="button" data-delete-food="${food.id}" ${editable ? "" : "disabled"}>Borrar</button>
        </div>
      </li>
    `;
  }).join("");

  els.catalogDrinkList.innerHTML = state.drinks.map((drink) => {
    const editable = canEditCatalogItem(drink);
    const label = drink.is_public ? "Público" : "Propio";
    return `
      <li>
        <div class="entry-main">
          <strong>${escapeHtml(drink.name)}</strong>
          <span>${drink.calories_per_100ml} kcal/100 ml - ${label}</span>
        </div>
        <div class="entry-actions">
          <button class="secondary" type="button" data-edit-drink="${drink.id}" ${editable ? "" : "disabled"}>Editar</button>
          <button class="danger" type="button" data-delete-drink="${drink.id}" ${editable ? "" : "disabled"}>Borrar</button>
        </div>
      </li>
    `;
  }).join("");

  els.catalogExerciseList.innerHTML = state.exercises.map((exercise) => {
    const editable = canEditCatalogItem(exercise);
    const label = exercise.is_public ? "Público" : "Propio";
    return `
      <li>
        <div class="entry-main">
          <strong>${escapeHtml(exercise.name)}</strong>
          <span>MET ${exercise.met} - ${label}</span>
        </div>
        <div class="entry-actions">
          <button class="secondary" type="button" data-edit-exercise="${exercise.id}" ${editable ? "" : "disabled"}>Editar</button>
          <button class="danger" type="button" data-delete-catalog-exercise="${exercise.id}" ${editable ? "" : "disabled"}>Borrar</button>
        </div>
      </li>
    `;
  }).join("");

  document.querySelectorAll("[data-edit-food]").forEach((button) => {
    button.addEventListener("click", () => startEditFood(button.dataset.editFood));
  });
  document.querySelectorAll("[data-delete-food]").forEach((button) => {
    button.addEventListener("click", () => deleteCatalogFood(button.dataset.deleteFood));
  });
  document.querySelectorAll("[data-edit-drink]").forEach((button) => {
    button.addEventListener("click", () => startEditDrink(button.dataset.editDrink));
  });
  document.querySelectorAll("[data-delete-drink]").forEach((button) => {
    button.addEventListener("click", () => deleteCatalogDrink(button.dataset.deleteDrink));
  });
  document.querySelectorAll("[data-edit-exercise]").forEach((button) => {
    button.addEventListener("click", () => startEditExercise(button.dataset.editExercise));
  });
  document.querySelectorAll("[data-delete-catalog-exercise]").forEach((button) => {
    button.addEventListener("click", () => deleteCatalogExercise(button.dataset.deleteCatalogExercise));
  });
}

function toggleCatalogList(type) {
  const { button, list, label } = getCatalogToggleElements(type);
  const isOpen = list.classList.toggle("hidden") === false;
  button.setAttribute("aria-expanded", String(isOpen));
  button.textContent = `${isOpen ? "Ocultar" : "Mostrar"} ${label}`;
}

function updateCatalogToggle(type) {
  const { button, list, label } = getCatalogToggleElements(type);
  const isOpen = !list.classList.contains("hidden");
  button.setAttribute("aria-expanded", String(isOpen));
  button.textContent = `${isOpen ? "Ocultar" : "Mostrar"} ${label}`;
}

function getCatalogToggleElements(type) {
  const catalogs = {
    food: { button: els.toggleFoodCatalog, list: els.catalogFoodList, label: "alimentos" },
    drink: { button: els.toggleDrinkCatalog, list: els.catalogDrinkList, label: "bebidas" },
    exercise: { button: els.toggleExerciseCatalog, list: els.catalogExerciseList, label: "deportes" }
  };
  return catalogs[type];
}

function renderProfileForm() {
  if (!state.profile) {
    els.displayName.value = getUserDisplayName();
    renderTargetPreview();
    return;
  }
  els.displayName.value = state.profile.display_name || getUserDisplayName();
  els.age.value = state.profile.age || "";
  els.sex.value = state.profile.sex || "male";
  els.height.value = state.profile.height_cm || "";
  els.weight.value = state.profile.current_weight_kg || "";
  els.activityLevel.value = state.profile.activity_factor || "1.2";
  els.goal.value = state.profile.goal || "lose";
  els.weightValue.value = state.profile.current_weight_kg || "";
  renderTargetPreview();
}

function renderTargetPreview() {
  const target = calculateTargetFromForm();
  els.targetPreview.textContent = target ? `Objetivo estimado: ${fmtKcal(target)} al día` : "Completa tus datos";
}

function calculateTargetFromForm() {
  const age = Number(els.age.value);
  const weight = Number(els.weight.value);
  const height = Number(els.height.value);
  const factor = Number(els.activityLevel.value);
  if (!age || !weight || !height || !factor) return 0;
  const bmr = els.sex.value === "female"
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;
  const maintenance = bmr * factor;
  if (els.goal.value === "lose") return maintenance - 500;
  if (els.goal.value === "gain") return maintenance + 300;
  return maintenance;
}

async function saveProfile(event) {
  event.preventDefault();
  const target = calculateTargetFromForm();
  const payload = {
    id: state.user.id,
    display_name: els.displayName.value.trim(),
    age: Number(els.age.value),
    sex: els.sex.value,
    height_cm: Number(els.height.value),
    current_weight_kg: Number(els.weight.value),
    activity_factor: Number(els.activityLevel.value),
    goal: els.goal.value,
    target_kcal: round(target)
  };
  const { data, error } = await supabaseClient.from("profiles").upsert(payload).select().single();
  if (error) return showError(error);
  state.profile = data;
  renderGreeting();
  renderDay();
  renderTargetPreview();
}

async function saveWeight(event) {
  event.preventDefault();
  const payload = {
    user_id: state.user.id,
    entry_date: els.weightDate.value,
    weight_kg: Number(els.weightValue.value)
  };
  const { error } = await supabaseClient.from("weight_entries").upsert(payload, { onConflict: "user_id,entry_date" });
  if (error) return showError(error);
  els.weight.value = payload.weight_kg;
  await supabaseClient.from("profiles").update({ current_weight_kg: payload.weight_kg }).eq("id", state.user.id);
  await Promise.all([loadProfile(), loadWeights()]);
  renderDay();
  renderHistory();
}

async function saveCatalogFood(event) {
  event.preventDefault();
  const id = els.catalogFoodId.value;
  const shouldBePublic = isAdmin() && els.catalogFoodPublic.checked;
  const payload = {
    user_id: shouldBePublic ? null : state.user.id,
    name: els.catalogFoodName.value.trim(),
    calories_per_100g: Number(els.catalogFoodCalories.value),
    protein_per_100g: Number(els.catalogFoodProtein.value || 0),
    carbs_per_100g: Number(els.catalogFoodCarbs.value || 0),
    fat_per_100g: Number(els.catalogFoodFat.value || 0),
    is_public: shouldBePublic
  };

  const result = id
    ? await supabaseClient.from("foods").update(payload).eq("id", id)
    : await supabaseClient.from("foods").insert(payload);

  if (result.error) return showError(result.error);
  resetCatalogFoodForm();
  await loadCatalogs();
  updateFoodPreview();
}

async function saveCatalogDrink(event) {
  event.preventDefault();
  const id = els.catalogDrinkId.value;
  const shouldBePublic = isAdmin() && els.catalogDrinkPublic.checked;
  const payload = {
    user_id: shouldBePublic ? null : state.user.id,
    name: els.catalogDrinkName.value.trim(),
    calories_per_100ml: Number(els.catalogDrinkCalories.value),
    is_public: shouldBePublic
  };

  const result = id
    ? await supabaseClient.from("drinks").update(payload).eq("id", id)
    : await supabaseClient.from("drinks").insert(payload);

  if (result.error) return showError(result.error);
  resetCatalogDrinkForm();
  await loadCatalogs();
  updateDrinkPreview();
}

async function saveCatalogExercise(event) {
  event.preventDefault();
  const id = els.catalogExerciseId.value;
  const shouldBePublic = isAdmin() && els.catalogExercisePublic.checked;
  const payload = {
    user_id: shouldBePublic ? null : state.user.id,
    name: els.catalogExerciseName.value.trim(),
    met: Number(els.catalogExerciseMet.value),
    is_public: shouldBePublic
  };

  const result = id
    ? await supabaseClient.from("exercise_catalog").update(payload).eq("id", id)
    : await supabaseClient.from("exercise_catalog").insert(payload);

  if (result.error) return showError(result.error);
  resetCatalogExerciseForm();
  await loadCatalogs();
  updateExercisePreview();
}

function startEditFood(id) {
  const food = state.foods.find((item) => item.id === id && canEditCatalogItem(item));
  if (!food) return;
  els.catalogFoodId.value = food.id;
  els.catalogFoodName.value = food.name;
  els.catalogFoodCalories.value = food.calories_per_100g;
  els.catalogFoodProtein.value = food.protein_per_100g || 0;
  els.catalogFoodCarbs.value = food.carbs_per_100g || 0;
  els.catalogFoodFat.value = food.fat_per_100g || 0;
  els.catalogFoodPublic.checked = food.is_public === true;
  els.saveCatalogFood.textContent = "Guardar alimento";
  els.cancelFoodEdit.classList.remove("hidden");
}

function startEditDrink(id) {
  const drink = state.drinks.find((item) => item.id === id && canEditCatalogItem(item));
  if (!drink) return;
  els.catalogDrinkId.value = drink.id;
  els.catalogDrinkName.value = drink.name;
  els.catalogDrinkCalories.value = drink.calories_per_100ml;
  els.catalogDrinkPublic.checked = drink.is_public === true;
  els.saveCatalogDrink.textContent = "Guardar bebida";
  els.cancelDrinkEdit.classList.remove("hidden");
}

function startEditExercise(id) {
  const exercise = state.exercises.find((item) => item.id === id && canEditCatalogItem(item));
  if (!exercise) return;
  els.catalogExerciseId.value = exercise.id;
  els.catalogExerciseName.value = exercise.name;
  els.catalogExerciseMet.value = exercise.met;
  els.catalogExercisePublic.checked = exercise.is_public === true;
  els.saveCatalogExercise.textContent = "Guardar deporte";
  els.cancelExerciseEdit.classList.remove("hidden");
}

function resetCatalogFoodForm() {
  els.catalogFoodForm.reset();
  els.catalogFoodId.value = "";
  els.catalogFoodProtein.value = "0";
  els.catalogFoodCarbs.value = "0";
  els.catalogFoodFat.value = "0";
  els.catalogFoodPublic.checked = false;
  els.saveCatalogFood.textContent = "Añadir alimento";
  els.cancelFoodEdit.classList.add("hidden");
}

function resetCatalogDrinkForm() {
  els.catalogDrinkForm.reset();
  els.catalogDrinkId.value = "";
  els.catalogDrinkPublic.checked = false;
  els.saveCatalogDrink.textContent = "Añadir bebida";
  els.cancelDrinkEdit.classList.add("hidden");
}

function resetCatalogExerciseForm() {
  els.catalogExerciseForm.reset();
  els.catalogExerciseId.value = "";
  els.catalogExercisePublic.checked = false;
  els.saveCatalogExercise.textContent = "Añadir deporte";
  els.cancelExerciseEdit.classList.add("hidden");
}

async function deleteCatalogFood(id) {
  if (!confirm("Quieres borrar este alimento?")) return;
  const { error } = await supabaseClient.from("foods").delete().eq("id", id);
  if (error) return showError(error);
  await loadCatalogs();
}

async function deleteCatalogDrink(id) {
  if (!confirm("Quieres borrar esta bebida?")) return;
  const { error } = await supabaseClient.from("drinks").delete().eq("id", id);
  if (error) return showError(error);
  await loadCatalogs();
}

async function deleteCatalogExercise(id) {
  if (!confirm("Quieres borrar este deporte?")) return;
  const { error } = await supabaseClient.from("exercise_catalog").delete().eq("id", id);
  if (error) return showError(error);
  await loadCatalogs();
}

async function saveMeal(event) {
  event.preventDefault();
  const items = getMealFoodItems();
  if (!items.length) return alert("Selecciona al menos un alimento.");

  const invalid = items.find((item) => !item.food);
  if (invalid) return alert(`El alimento "${invalid.name}" no está en la base de datos. Primero añádelo en el catálogo o usa uno de la lista.`);

  const groupResult = await supabaseClient.from("meal_groups").insert({
    user_id: state.user.id,
    entry_date: els.currentDate.value,
    meal_type: els.mealType.value
  }).select().single();
  if (groupResult.error) return showError(groupResult.error);

  const rows = items.map((item) => ({
    user_id: state.user.id,
    entry_date: els.currentDate.value,
    meal_group_id: groupResult.data.id,
    meal_type: els.mealType.value,
    food_id: item.food.id,
    quantity_g: item.grams,
    calories: round((Number(item.food.calories_per_100g) * item.grams) / 100)
  }));

  const { error } = await supabaseClient.from("meal_entries").insert(rows);
  if (error) {
    await supabaseClient.from("meal_groups").delete().eq("id", groupResult.data.id).eq("user_id", state.user.id);
    return showError(error);
  }
  resetMealFoodRows();
  await loadDay();
  if ($("#meals").classList.contains("active")) renderMealsTimeline();
  updateFoodPreview();
}

function getMealFoodItems() {
  return Array.from(els.mealFoods.querySelectorAll(".meal-food-row")).map((row) => {
    const name = row.querySelector(".food-search").value.trim();
    const grams = Number(row.querySelector(".food-grams").value);
    return {
      name,
      grams,
      food: name && grams > 0 ? findByName(state.foods, name) : null
    };
  }).filter((item) => item.name);
}

function addMealFoodRow() {
  const row = document.createElement("div");
  row.className = "meal-food-row form-grid";
  row.innerHTML = `
    <label>
      Alimento
      <input class="food-search" list="food-options" type="text" placeholder="Escribe un alimento" required>
    </label>
    <label>
      Gramos
      <input class="food-grams" type="number" min="1" step="1" value="100" required>
    </label>
    <button class="danger remove-food-line" type="button" data-remove-food-line>Quitar</button>
  `;
  els.mealFoods.appendChild(row);
  row.querySelector(".food-search").focus();
  updateFoodPreview();
}

function handleMealFoodsClick(event) {
  const removeButton = event.target.closest("[data-remove-food-line]");
  if (!removeButton) return;
  removeButton.closest(".meal-food-row").remove();
  updateFoodPreview();
}

function resetMealFoodRows() {
  els.mealFoods.querySelectorAll(".meal-food-row:not(:first-child)").forEach((row) => row.remove());
  els.foodSearch.value = "";
  els.foodGrams.value = "100";
}

function handleAutocompleteFocus(event) {
  const input = getAutocompleteInput(event.target);
  if (!input) return;
  renderAutocomplete(input);
}

function handleAutocompleteInput(event) {
  const input = getAutocompleteInput(event.target);
  if (!input) return;
  renderAutocomplete(input);
}

function closeAutocompleteOnOutsideClick(event) {
  if (event.target.closest(".autocomplete-list") || getAutocompleteInput(event.target)) return;
  closeAutocomplete();
}

function getAutocompleteInput(target) {
  if (!target?.matches) return null;
  return target.matches(".food-search, #drink-search, #exercise-search") ? target : null;
}

function getAutocompleteData(input) {
  if (input.classList.contains("food-search")) {
    return { items: state.foods, onSelect: updateFoodPreview };
  }
  if (input.id === "drink-search") {
    return { items: state.drinks, onSelect: updateDrinkPreview };
  }
  if (input.id === "exercise-search") {
    return { items: state.exercises, onSelect: updateExercisePreview };
  }
  return { items: [], onSelect: () => {} };
}

function renderAutocomplete(input) {
  const { items, onSelect } = getAutocompleteData(input);
  const query = input.value.trim().toLowerCase();
  const matches = items
    .filter((item) => !query || item.name.toLowerCase().includes(query))
    .slice(0, 40);

  closeAutocomplete();
  if (!matches.length) return;

  const list = document.createElement("div");
  list.className = "autocomplete-list";
  list.innerHTML = matches.map((item) => `
    <button type="button" data-autocomplete-value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</button>
  `).join("");

  input.insertAdjacentElement("afterend", list);
  list.querySelectorAll("button").forEach((button) => {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      input.value = button.dataset.autocompleteValue;
      closeAutocomplete();
      onSelect();
    });
  });
}

function closeAutocomplete() {
  document.querySelectorAll(".autocomplete-list").forEach((list) => list.remove());
}

async function saveDrink(event) {
  event.preventDefault();
  const drink = findByName(state.drinks, els.drinkSearch.value);
  if (!drink) return alert("Esa bebida no está en la base de datos. Primero añádela en el catálogo o usa una de la lista.");
  const ml = Number(els.drinkMl.value);
  const calories = (Number(drink.calories_per_100ml) * ml) / 100;
  const { error } = await supabaseClient.from("drink_entries").insert({
    user_id: state.user.id,
    entry_date: els.currentDate.value,
    drink_id: drink.id,
    quantity_ml: ml,
    calories: round(calories)
  });
  if (error) return showError(error);
  els.drinkSearch.value = "";
  await loadDay();
  if ($("#meals").classList.contains("active")) renderMealsTimeline();
  updateDrinkPreview();
}

async function saveExercise(event) {
  event.preventDefault();
  const exercise = findByName(state.exercises, els.exerciseSearch.value);
  if (!exercise) return alert("Esa actividad no está en la base de datos. Usa una de la lista.");
  const minutes = Number(els.exerciseMinutes.value);
  const weight = Number(state.profile?.current_weight_kg || els.weight.value || 75);
  const calories = calculateExerciseCalories(exercise.met, weight, minutes);
  const { error } = await supabaseClient.from("exercise_entries").insert({
    user_id: state.user.id,
    entry_date: els.currentDate.value,
    exercise_id: exercise.id,
    minutes,
    calories: round(calories)
  });
  if (error) return showError(error);
  els.exerciseSearch.value = "";
  await loadDay();
  updateExercisePreview();
}

async function deleteRow(table, id) {
  const { error } = await supabaseClient.from(table).delete().eq("id", id).eq("user_id", state.user.id);
  if (error) return showError(error);
  await loadDay();
  if ($("#meals").classList.contains("active")) renderMealsTimeline();
}

async function deleteMealGroup(id) {
  if (String(id).startsWith("entry:")) {
    return deleteRow("meal_entries", id.replace("entry:", ""));
  }
  const { error } = await supabaseClient.from("meal_groups").delete().eq("id", id).eq("user_id", state.user.id);
  if (error) return showError(error);
  await loadDay();
  if ($("#meals").classList.contains("active")) renderMealsTimeline();
}

function groupMealsForDay(meals) {
  const groups = new Map();
  meals.forEach((item) => {
    const id = item.meal_group_id || `entry:${item.id}`;
    if (!groups.has(id)) {
      groups.set(id, {
        id,
        mealType: item.meal_groups?.meal_type || item.meal_type,
        entryDate: item.entry_date,
        createdAt: item.meal_groups?.created_at || item.created_at,
        total: 0,
        items: []
      });
    }
    const group = groups.get(id);
    group.total += Number(item.calories || 0);
    group.items.push(item);
  });
  return Array.from(groups.values()).sort((a, b) => {
    const dateOrder = String(a.entryDate).localeCompare(String(b.entryDate));
    if (dateOrder !== 0) return dateOrder;
    return String(a.createdAt).localeCompare(String(b.createdAt));
  });
}

function renderMealGroupsHtml(groups, { showDate = false } = {}) {
  return groups.map((group) => `
    <li class="meal-group-item">
      <div class="entry-main">
        <strong>${showDate ? `${formatDate(group.entryDate)} - ` : ""}${escapeHtml(group.mealType)}</strong>
        <span>${group.items.length} alimento${group.items.length === 1 ? "" : "s"} - ${fmtKcal(group.total)}</span>
        <div class="meal-items">
          ${group.items.map((item) => `
            <span>${escapeHtml(item.foods?.name || "Alimento")} - ${item.quantity_g} g - ${fmtKcal(item.calories)}</span>
          `).join("")}
        </div>
      </div>
      <button class="danger" type="button" data-delete-meal-group="${group.id}">Borrar</button>
    </li>
  `).join("");
}

function bindMealGroupDeleteButtons(container = document) {
  container.querySelectorAll("[data-delete-meal-group]").forEach((button) => {
    button.addEventListener("click", () => deleteMealGroup(button.dataset.deleteMealGroup));
  });
}

function renderDay() {
  const foodTotal = state.meals.reduce((sum, item) => sum + Number(item.calories || 0), 0);
  const drinkTotal = state.drinkEntries.reduce((sum, item) => sum + Number(item.calories || 0), 0);
  const consumedTotal = foodTotal + drinkTotal;
  const exerciseTotal = state.exerciseEntries.reduce((sum, item) => sum + Number(item.calories || 0), 0);
  const target = Number(state.profile?.target_kcal || 0);
  const net = consumedTotal - exerciseTotal;

  $("#target-kcal").textContent = fmtKcal(target);
  $("#food-kcal").textContent = fmtKcal(foodTotal);
  $("#drink-kcal").textContent = fmtKcal(drinkTotal);
  $("#exercise-kcal").textContent = fmtKcal(exerciseTotal);
  const remainingRaw = target - net;
  const remaining = Math.abs(remainingRaw);
  const progress = target > 0 ? Math.min(Math.max((net / target) * 100, 0), 100) : 0;
  $("#net-kcal").textContent = fmtKcal(remaining);
  $("#balance-caption").textContent = remainingRaw >= 0 ? "restantes" : "exceso";
  $("#balance-percent").textContent = `${Math.round(progress)}%`;
  $("#balance-bar").style.setProperty("--progress", `${progress}%`);
  document.querySelector(".metric.accent")?.classList.toggle("is-over", remainingRaw < 0);
  renderWeightProgress();
  renderMacros();
  $("#meal-total").textContent = fmtKcal(foodTotal);
  $("#drink-total").textContent = fmtKcal(drinkTotal);
  $("#exercise-total").textContent = fmtKcal(exerciseTotal);

  els.exerciseList.innerHTML = state.exerciseEntries.map((item) => `
    <li>
      <div class="entry-main">
        <strong>${escapeHtml(item.exercise_catalog?.name || "Ejercicio")}</strong>
        <span>${item.minutes} min - ${fmtKcal(item.calories)}</span>
      </div>
      <button class="danger" type="button" data-delete-exercise="${item.id}">Borrar</button>
    </li>
  `).join("");

  document.querySelectorAll("[data-delete-exercise]").forEach((button) => {
    button.addEventListener("click", () => deleteRow("exercise_entries", button.dataset.deleteExercise));
  });
}

function renderCurrentDateDisplay() {
  els.currentDateDisplay.textContent = formatLongDate(els.currentDate.value || todayISO());
}

function renderMacros() {
  const totals = state.meals.reduce((sum, item) => {
    const grams = Number(item.quantity_g || 0) / 100;
    sum.protein += Number(item.foods?.protein_per_100g || 0) * grams;
    sum.carbs += Number(item.foods?.carbs_per_100g || 0) * grams;
    sum.fat += Number(item.foods?.fat_per_100g || 0) * grams;
    return sum;
  }, { protein: 0, carbs: 0, fat: 0 });
  const targets = calculateMacroTargets();
  updateMacro("protein", totals.protein, targets.protein);
  updateMacro("carbs", totals.carbs, targets.carbs);
  updateMacro("fat", totals.fat, targets.fat);
}

function updateMacro(type, value, target) {
  const rounded = Math.round(value);
  const progress = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  $(`#${type}-total`).textContent = `${rounded}g`;
  $(`#${type}-bar`).style.setProperty("--progress", `${progress}%`);
}

function calculateMacroTargets() {
  const weight = Number(state.profile?.current_weight_kg || els.weight.value || 75);
  const targetKcal = Number(state.profile?.target_kcal || calculateTargetFromForm() || 2000);
  const protein = Math.max(weight * 1.6, 90);
  const fat = Math.max(weight * 0.8, 45);
  const carbs = Math.max((targetKcal - protein * 4 - fat * 9) / 4, 80);
  return { protein, carbs, fat };
}

function renderWeightProgress() {
  const currentWeight = getCurrentWeightValue();
  $("#current-weight-display").textContent = currentWeight ? fmtKg(currentWeight) : "0 kg";
  $("#weekly-weight-change").textContent = getWeeklyWeightChangeText(currentWeight);
}

function getCurrentWeightValue() {
  return Number(state.weights[0]?.weight_kg || state.profile?.current_weight_kg || els.weight.value || 0);
}

function getWeeklyWeightChangeText(currentWeight) {
  if (!currentWeight || state.weights.length < 2) return "Sin cambios esta semana";
  const latestDate = new Date(`${state.weights[0].entry_date}T00:00:00`);
  const weekAgo = new Date(latestDate);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const previous = state.weights.find((item) => new Date(`${item.entry_date}T00:00:00`) <= weekAgo) || state.weights[state.weights.length - 1];
  if (!previous) return "Sin cambios esta semana";
  const diff = currentWeight - Number(previous.weight_kg || 0);
  if (!Number.isFinite(diff) || Math.abs(diff) < 0.05) return "Sin cambios esta semana";
  const arrow = diff < 0 ? "↓" : "↑";
  const sign = diff > 0 ? "+" : "";
  return `${arrow} ${sign}${diff.toLocaleString("es-ES", { maximumFractionDigits: 1 })} kg esta semana`;
}

function renderWeights() {
  updateWeightListToggle();
  els.weightList.innerHTML = state.weights.slice(0, 8).map((item) => `
    <li>
      <div class="entry-main">
        <strong>${fmtKg(item.weight_kg)}</strong>
        <span>${formatDate(item.entry_date)}</span>
      </div>
    </li>
  `).join("");
}

function toggleWeightList() {
  const isOpen = els.weightList.classList.toggle("hidden") === false;
  els.toggleWeightList.setAttribute("aria-expanded", String(isOpen));
  els.toggleWeightList.textContent = isOpen ? "Ocultar pesos" : "Mostrar pesos";
}

function updateWeightListToggle() {
  const isOpen = !els.weightList.classList.contains("hidden");
  els.toggleWeightList.setAttribute("aria-expanded", String(isOpen));
  els.toggleWeightList.textContent = isOpen ? "Ocultar pesos" : "Mostrar pesos";
}

async function renderMealsTimeline() {
  if (!state.user) return;
  const date = els.mealsDate.value || todayISO();

  const [mealsResult, drinksResult] = await Promise.all([
    supabaseClient
      .from("meal_entries")
      .select("*, foods(name), meal_groups(id, meal_type, created_at)")
      .eq("user_id", state.user.id)
      .eq("entry_date", date)
      .order("created_at", { ascending: false }),
    supabaseClient
      .from("drink_entries")
      .select("*, drinks(name)")
      .eq("user_id", state.user.id)
      .eq("entry_date", date)
      .order("created_at", { ascending: false })
  ]);
  if (mealsResult.error) return showError(mealsResult.error);
  if (drinksResult.error) return showError(drinksResult.error);

  const mealGroups = groupMealsForDay(mealsResult.data || []);
  const entries = [
    ...mealGroups.map((group) => ({
      type: "meal",
      date: group.entryDate,
      createdAt: group.createdAt,
      html: renderMealGroupsHtml([group], { showDate: true })
    })),
    ...(drinksResult.data || []).map((item) => ({
      type: "drink",
      date: item.entry_date,
      createdAt: item.created_at,
      html: `
        <li>
          <div class="entry-main">
            <strong>${formatDate(item.entry_date)} - Bebida</strong>
            <span>${escapeHtml(item.drinks?.name || "Bebida")} - ${item.quantity_ml} ml - ${fmtKcal(item.calories)}</span>
          </div>
          <button class="danger" type="button" data-delete-drink-entry="${item.id}">Borrar</button>
        </li>
      `
    }))
  ].sort((a, b) => {
    const dateOrder = String(b.date).localeCompare(String(a.date));
    if (dateOrder !== 0) return dateOrder;
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });

  els.mealsTimeline.innerHTML = entries.length
    ? entries.map((entry) => entry.html).join("")
    : '<p class="empty-state">Todavía no hay comidas registradas para esta fecha.</p>';

  bindMealGroupDeleteButtons(els.mealsTimeline);
  els.mealsTimeline.querySelectorAll("[data-delete-drink-entry]").forEach((button) => {
    button.addEventListener("click", () => deleteRow("drink_entries", button.dataset.deleteDrinkEntry));
  });
}

async function renderHistory() {
  if (!state.user) return;
  if (!$("#history").classList.contains("active")) return;

  const [mealsResult, drinksResult, exercisesResult] = await Promise.all([
    fetchAllRows((from, to) => supabaseClient.from("meal_entries").select("entry_date, calories, meal_type").eq("user_id", state.user.id).order("entry_date").range(from, to)),
    fetchAllRows((from, to) => supabaseClient.from("drink_entries").select("entry_date, calories").eq("user_id", state.user.id).order("entry_date").range(from, to)),
    fetchAllRows((from, to) => supabaseClient.from("exercise_entries").select("entry_date, calories").eq("user_id", state.user.id).order("entry_date").range(from, to))
  ]);
  if (mealsResult.error) return showError(mealsResult.error);
  if (drinksResult.error) return showError(drinksResult.error);
  if (exercisesResult.error) return showError(exercisesResult.error);

  const days = new Map();
  const ensureDay = (date) => {
    if (!days.has(date)) days.set(date, { date, food: 0, drink: 0, exercise: 0 });
    return days.get(date);
  };

  mealsResult.data.forEach((item) => {
    ensureDay(item.entry_date).food += Number(item.calories);
  });
  drinksResult.data.forEach((item) => {
    ensureDay(item.entry_date).drink += Number(item.calories);
  });
  exercisesResult.data.forEach((item) => {
    ensureDay(item.entry_date).exercise += Number(item.calories);
  });

  const daysWithEntries = Array.from(days.values()).sort((a, b) => b.date.localeCompare(a.date));
  const daysAscending = [...daysWithEntries].reverse();
  renderLineChart({
    canvas: els.weightChart,
    empty: els.weightChartEmpty,
    points: state.weights
      .map((item) => ({ date: item.entry_date, value: Number(item.weight_kg) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    color: "#217a5b",
    suffix: " kg"
  });
  renderLineChart({
    canvas: els.burnedChart,
    empty: els.burnedChartEmpty,
    points: daysAscending
      .filter((day) => day.exercise > 0)
      .map((day) => ({ date: day.date, value: day.exercise })),
    color: "#b85728",
    suffix: " kcal"
  });
  renderLineChart({
    canvas: els.consumedChart,
    empty: els.consumedChartEmpty,
    points: daysAscending
      .filter((day) => day.food + day.drink > 0)
      .map((day) => ({ date: day.date, value: day.food + day.drink })),
    color: "#2c6fb0",
    suffix: " kcal"
  });
  renderDonutChart({
    canvas: els.mealTypeChart,
    empty: els.mealTypeChartEmpty,
    segments: buildMealTypeSegments(mealsResult.data || [])
  });
  renderMealTypeDays(mealsResult.data || []);

  // Store chart data for re-rendering on resize
  els.weightChart._chartData = {
    empty: els.weightChartEmpty,
    points: state.weights
      .map((item) => ({ date: item.entry_date, value: Number(item.weight_kg) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    color: "#217a5b",
    suffix: " kg"
  };
  els.burnedChart._chartData = {
    empty: els.burnedChartEmpty,
    points: daysAscending
      .filter((day) => day.exercise > 0)
      .map((day) => ({ date: day.date, value: day.exercise })),
    color: "#b85728",
    suffix: " kcal"
  };
  els.consumedChart._chartData = {
    empty: els.consumedChartEmpty,
    points: daysAscending
      .filter((day) => day.food + day.drink > 0)
      .map((day) => ({ date: day.date, value: day.food + day.drink })),
    color: "#2c6fb0",
    suffix: " kcal"
  };
  els.mealTypeChart._chartData = {
    empty: els.mealTypeChartEmpty,
    segments: buildMealTypeSegments(mealsResult.data || [])
  };

}

function renderMealTypeDays(meals) {
  const dayCount = new Set(meals.map((meal) => meal.entry_date).filter(Boolean)).size;
  els.mealTypeDays.textContent = `Dias registrados: ${dayCount}`;
  els.mealTypeDays.classList.toggle("hidden", dayCount === 0);
}

function renderLineChart({ canvas, empty, points, color, suffix }) {
  const hasData = points.length > 0;
  canvas.classList.toggle("hidden", !hasData);
  empty.classList.toggle("hidden", hasData);

  if (!hasData) {
    canvas.innerHTML = "";
    return;
  }

  const displayPoints = points;
  const values = displayPoints.map((p) => p.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const hasFlatValues = maxValue === minValue;
  const range = hasFlatValues ? 1 : maxValue - minValue;
  const width = 360;
  const height = 220;
  const padding = { top: 18, right: 18, bottom: 42, left: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const coords = displayPoints.map((point, index) => {
    const x = displayPoints.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (plotWidth * index) / (displayPoints.length - 1);
    const y = hasFlatValues
      ? padding.top + plotHeight / 2
      : padding.top + plotHeight - ((point.value - minValue) / range) * plotHeight;
    return { ...point, x, y };
  });

  const linePoints = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = [
    `${coords[0].x},${padding.top + plotHeight}`,
    linePoints,
    `${coords[coords.length - 1].x},${padding.top + plotHeight}`
  ].join(" ");
  const gridLines = [0, 0.5, 1].map((step) => {
    const y = padding.top + plotHeight * step;
    const value = hasFlatValues ? maxValue : maxValue - range * step;
    return `
      <g class="line-chart-grid">
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>
        <text x="${padding.left - 8}" y="${y + 4}">${formatChartValue(value, suffix)}</text>
      </g>
    `;
  }).join("");
  const ticks = buildChartTicks(coords);
  const pointRadius = displayPoints.length > 80 ? 2.4 : displayPoints.length > 35 ? 3.2 : 4.5;
  const showPointValues = displayPoints.length <= 18;

  canvas.innerHTML = `
    <svg class="line-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfica de evolución">
      ${gridLines}
      <polygon class="line-chart-area" points="${areaPoints}" style="fill: ${color};"></polygon>
      <polyline class="line-chart-line" points="${linePoints}" style="stroke: ${color};"></polyline>
      ${coords.map((point) => `
        <g class="line-chart-point">
          <circle cx="${point.x}" cy="${point.y}" r="${pointRadius}" style="fill: ${color};"></circle>
          ${showPointValues ? `<text class="point-value" x="${point.x}" y="${Math.max(12, point.y - 9)}">${formatChartValue(point.value, suffix)}</text>` : ""}
        </g>
      `).join("")}
      ${ticks.map((tick) => `
        <text class="point-date" x="${tick.x}" y="${height - 13}">${tick.label}</text>
      `).join("")}
    </svg>
  `;
}

function buildChartTicks(points) {
  if (points.length <= 12) {
    return points.map((point) => ({ x: point.x, label: formatShortDate(point.date) }));
  }

  if (points.length <= 45) {
    const interval = Math.ceil(points.length / 7);
    return points
      .filter((_point, index) => index % interval === 0 || index === points.length - 1)
      .map((point) => ({ x: point.x, label: formatShortDate(point.date) }));
  }

  const monthTicks = [];
  const seenMonths = new Set();
  points.forEach((point) => {
    const monthKey = point.date.slice(0, 7);
    if (seenMonths.has(monthKey)) return;
    seenMonths.add(monthKey);
    monthTicks.push({ x: point.x, label: formatMonthDate(point.date) });
  });

  if (monthTicks.length <= 8) return monthTicks;

  const interval = Math.ceil(monthTicks.length / 8);
  return monthTicks.filter((_tick, index) => index % interval === 0 || index === monthTicks.length - 1);
}

function buildMealTypeSegments(meals) {
  const mealTypes = [
    { key: "Desayuno", label: "Desayuno", color: "#217a5b" },
    { key: "Almuerzo", label: "Almuerzo", color: "#d08a1d" },
    { key: "Cena", label: "Cena", color: "#2c6fb0" },
    { key: "Snack", label: "Snack", color: "#8a5bb8" }
  ];
  const totals = new Map(mealTypes.map((item) => [item.key, 0]));

  meals.forEach((meal) => {
    const key = normalizeMealTypeForChart(meal.meal_type);
    if (!key) return;
    totals.set(key, totals.get(key) + Number(meal.calories || 0));
  });

  return mealTypes.map((item) => ({ ...item, value: totals.get(item.key) || 0 }));
}

function normalizeMealTypeForChart(mealType) {
  const normalized = String(mealType || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "desayuno") return "Desayuno";
  if (normalized === "almuerzo" || normalized === "comida") return "Almuerzo";
  if (normalized === "cena") return "Cena";
  if (normalized === "snack" || normalized === "merienda") return "Snack";
  return null;
}

function renderDonutChart({ canvas, empty, segments }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const hasData = total > 0;
  canvas.classList.toggle("hidden", !hasData);
  empty.classList.toggle("hidden", hasData);

  if (!hasData) {
    canvas.innerHTML = "";
    return;
  }

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const rings = segments.filter((segment) => segment.value > 0).map((segment) => {
    const length = (segment.value / total) * circumference;
    const dash = `${length} ${circumference - length}`;
    const ring = `
      <circle
        class="donut-segment"
        cx="90"
        cy="90"
        r="${radius}"
        stroke="${segment.color}"
        stroke-dasharray="${dash}"
        stroke-dashoffset="${-offset}"
        data-label="${escapeHtml(segment.label)}"
        data-value="${escapeHtml(fmtKcal(segment.value))}"
        tabindex="0"
        role="button"
        aria-label="${escapeHtml(`${segment.label}: ${fmtKcal(segment.value)}`)}"
      ></circle>
    `;
    offset += length;
    return ring;
  }).join("");

  canvas.innerHTML = `
    <div class="donut-visual">
      <svg class="donut-svg" viewBox="0 0 180 180" role="img" aria-label="Calorías consumidas por tipo de comida">
        <circle class="donut-track" cx="90" cy="90" r="${radius}"></circle>
        ${rings}
      </svg>
      <div class="donut-total">
        <strong>${fmtKcal(total)}</strong>
        <span>Total</span>
      </div>
      <div class="donut-tooltip hidden" role="status"></div>
    </div>
  `;
  bindDonutTooltip(canvas);
}

function bindDonutTooltip(canvas) {
  if (canvas._donutCleanup) canvas._donutCleanup();

  const tooltip = canvas.querySelector(".donut-tooltip");
  const segments = canvas.querySelectorAll(".donut-segment");
  if (!tooltip || !segments.length) return;

  const show = (segment) => {
    tooltip.innerHTML = `
      <strong>${segment.dataset.label}</strong>
      <span>${segment.dataset.value}</span>
    `;
    tooltip.classList.remove("hidden");
    segments.forEach((item) => item.classList.toggle("is-active", item === segment));
  };
  const hide = () => {
    tooltip.classList.add("hidden");
    segments.forEach((item) => item.classList.remove("is-active"));
  };

  segments.forEach((segment) => {
    segment.addEventListener("mouseenter", () => show(segment));
    segment.addEventListener("focus", () => show(segment));
    segment.addEventListener("click", (event) => {
      event.stopPropagation();
      show(segment);
    });
  });
  canvas.addEventListener("mouseleave", hide);
  canvas.addEventListener("focusout", (event) => {
    if (!canvas.contains(event.relatedTarget)) hide();
  });
  const onDocumentClick = (event) => {
    if (!canvas.contains(event.target)) hide();
  };
  document.addEventListener("click", onDocumentClick);
  canvas._donutCleanup = () => document.removeEventListener("click", onDocumentClick);
}


function updateFoodPreview() {
  const items = getMealFoodItems().filter((item) => item.food && item.grams > 0);
  const total = items.reduce((sum, item) => sum + (Number(item.food.calories_per_100g) * item.grams) / 100, 0);
  if (!items.length) {
    els.foodPreview.textContent = "Selecciona un alimento";
    return;
  }
  els.foodPreview.textContent = items.length === 1
    ? `${fmtKcal(total)} - ${items[0].food.calories_per_100g} kcal/100 g`
    : `${fmtKcal(total)} en ${items.length} alimentos`;
}

function updateDrinkPreview() {
  const drink = findByName(state.drinks, els.drinkSearch.value);
  const ml = Number(els.drinkMl.value);
  els.drinkPreview.textContent = drink && ml
    ? `${fmtKcal((drink.calories_per_100ml * ml) / 100)} - ${drink.calories_per_100ml} kcal/100 ml`
    : "Selecciona una bebida";
}

function updateExercisePreview() {
  const exercise = findByName(state.exercises, els.exerciseSearch.value);
  const minutes = Number(els.exerciseMinutes.value);
  const weight = Number(state.profile?.current_weight_kg || els.weight.value || 75);
  els.exercisePreview.textContent = exercise && minutes
    ? `${fmtKcal(calculateExerciseCalories(exercise.met, weight, minutes))} con ${fmtKg(weight)}`
    : "Calculado con tu peso actual";
}

function calculateExerciseCalories(met, weightKg, minutes) {
  return (Number(met) * 3.5 * Number(weightKg) / 200) * Number(minutes);
}

function findByName(list, name) {
  const normalized = String(name || "").trim().toLowerCase();
  return list.find((item) => item.name.toLowerCase() === normalized);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function formatMonthDate(date) {
  return new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit" }).format(new Date(`${date}T00:00:00`));
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(`${date}T00:00:00`));
}

function formatChartValue(value, suffix) {
  const maximumFractionDigits = suffix.trim() === "kg" ? 1 : 0;
  return `${Number(value || 0).toLocaleString("es-ES", { maximumFractionDigits })}${suffix}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showError(error) {
  console.error(error);
  alert(error.message || "Ha ocurrido un error");
}

init();
