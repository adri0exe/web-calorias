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
  userEmail: $("#user-email"),
  logoutButton: $("#logout-button"),
  authForm: $("#auth-form"),
  authMessage: $("#auth-message"),
  currentDate: $("#current-date"),
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
  sex: $("#sex"),
  height: $("#height"),
  weight: $("#weight"),
  activityLevel: $("#activity-level"),
  goal: $("#goal"),
  targetPreview: $("#target-preview"),
  profileForm: $("#profile-form"),
  weightForm: $("#weight-form"),
  weightValue: $("#weight-value"),
  weightList: $("#weight-list"),
  historyList: $("#history-list"),
  refreshHistory: $("#refresh-history"),
  weightChart: $("#weight-chart"),
  weightChartEmpty: $("#weight-chart-empty"),
  burnedChart: $("#burned-chart"),
  burnedChartEmpty: $("#burned-chart-empty"),
  consumedChart: $("#consumed-chart"),
  consumedChartEmpty: $("#consumed-chart-empty"),
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
  catalogFoodList: $("#catalog-food-list"),
  catalogDrinkForm: $("#catalog-drink-form"),
  catalogDrinkId: $("#catalog-drink-id"),
  catalogDrinkName: $("#catalog-drink-name"),
  catalogDrinkCalories: $("#catalog-drink-calories"),
  catalogDrinkPublicLabel: $("#catalog-drink-public-label"),
  catalogDrinkPublic: $("#catalog-drink-public"),
  saveCatalogDrink: $("#save-catalog-drink"),
  cancelDrinkEdit: $("#cancel-drink-edit"),
  catalogDrinkList: $("#catalog-drink-list"),
  catalogExerciseForm: $("#catalog-exercise-form"),
  catalogExerciseId: $("#catalog-exercise-id"),
  catalogExerciseName: $("#catalog-exercise-name"),
  catalogExerciseMet: $("#catalog-exercise-met"),
  catalogExercisePublicLabel: $("#catalog-exercise-public-label"),
  catalogExercisePublic: $("#catalog-exercise-public"),
  saveCatalogExercise: $("#save-catalog-exercise"),
  cancelExerciseEdit: $("#cancel-exercise-edit"),
  catalogExerciseList: $("#catalog-exercise-list")
};

function init() {
  els.currentDate.value = todayISO();
  els.weightDate.value = todayISO();
  els.mealsDate.value = todayISO();
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
    scrollTimeout = setTimeout(() => {
      const charts = [els.weightChart, els.burnedChart, els.consumedChart];
      charts.forEach((canvas) => {
        if (canvas && canvas._needsRender) {
          const { points, color, suffix } = canvas._needsRender;
          renderLineChart({ canvas, empty: canvas.nextElementSibling, points, color, suffix });
        }
      });
    }, 100);
  }, { passive: true });
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });
  els.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await signIn();
  });
  els.logoutButton.addEventListener("click", () => supabaseClient.auth.signOut());
  els.currentDate.addEventListener("change", () => {
    els.mealsDate.value = els.currentDate.value;
    loadDay();
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
  els.refreshHistory.addEventListener("click", loadAll);
  els.mealsDate.addEventListener("change", renderMealsTimeline);
  els.refreshMeals.addEventListener("click", renderMealsTimeline);
  els.catalogFoodForm.addEventListener("submit", saveCatalogFood);
  els.catalogDrinkForm.addEventListener("submit", saveCatalogDrink);
  els.catalogExerciseForm.addEventListener("submit", saveCatalogExercise);
  els.cancelFoodEdit.addEventListener("click", resetCatalogFoodForm);
  els.cancelDrinkEdit.addEventListener("click", resetCatalogDrinkForm);
  els.cancelExerciseEdit.addEventListener("click", resetCatalogExerciseForm);
  document.addEventListener("click", closeAutocompleteOnOutsideClick);
}

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tabName));
  if (tabName === "meals" && state.user) renderMealsTimeline();
  if (tabName === "history" && state.user) requestAnimationFrame(renderHistory);
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
  els.logoutButton.classList.toggle("hidden", !logged);
  els.userEmail.textContent = state.user?.email || "";
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
    supabaseClient.from("meal_entries").select("*, foods(name), meal_groups(id, meal_type, created_at)").eq("user_id", state.user.id).eq("entry_date", date).order("created_at"),
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
  const { data, error } = await supabaseClient
    .from("weight_entries")
    .select("*")
    .eq("user_id", state.user.id)
    .order("entry_date", { ascending: false });
  if (error) return showError(error);
  state.weights = data || [];
  renderWeights();
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

function renderProfileForm() {
  if (!state.profile) {
    renderTargetPreview();
    return;
  }
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
  $("#net-kcal").textContent = `${fmtKcal(net)} / ${fmtKcal(target)}`;
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

function renderWeights() {
  els.weightList.innerHTML = state.weights.slice(0, 8).map((item) => `
    <li>
      <div class="entry-main">
        <strong>${fmtKg(item.weight_kg)}</strong>
        <span>${formatDate(item.entry_date)}</span>
      </div>
    </li>
  `).join("");
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
    supabaseClient.from("meal_entries").select("entry_date, calories").eq("user_id", state.user.id),
    supabaseClient.from("drink_entries").select("entry_date, calories").eq("user_id", state.user.id),
    supabaseClient.from("exercise_entries").select("entry_date, calories").eq("user_id", state.user.id)
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

  if (!daysWithEntries.length) {
    els.historyList.innerHTML = '<p class="empty-state">Todavía no hay registros de comidas, bebidas o ejercicio.</p>';
    return;
  }

  els.historyList.innerHTML = daysWithEntries.map((day) => {
    const consumed = day.food + day.drink;
    const net = consumed - day.exercise;
    return `
      <div class="history-item">
        <strong>${formatDate(day.date)}</strong>
        <span>Comidas: ${fmtKcal(day.food)}</span>
        <span>Bebidas: ${fmtKcal(day.drink)}</span>
        <span>Ejercicio: ${fmtKcal(day.exercise)}</span>
        <span>Balance: ${fmtKcal(net)}</span>
        <span>Objetivo: ${fmtKcal(state.profile?.target_kcal || 0)}</span>
      </div>
    `;
  }).join("");
}

function renderLineChart({ canvas, empty, points, color, suffix }) {
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const width = Math.floor(
    canvas.clientWidth ||
    rect.width ||
    canvas.parentElement?.clientWidth ||
    canvas.parentElement?.getBoundingClientRect().width ||
    0
  );
  const height = Number(canvas.getAttribute("height")) || 220;
  if (!width || rect.width === 0) {
    // Element might be hidden, mark for later rendering
    canvas._needsRender = { points, color, suffix };
    return;
  }
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const hasData = points.length > 0;
  canvas.classList.toggle("hidden", !hasData);
  empty.classList.toggle("hidden", hasData);
  if (!hasData) return;

  const padding = { top: 18, right: 18, bottom: 34, left: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const low = minValue - range * 0.08;
  const high = maxValue + range * 0.08;
  const valueRange = high - low || 1;
  const xFor = (index) => padding.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const yFor = (value) => padding.top + (1 - (value - low) / valueRange) * plotHeight;

  ctx.strokeStyle = "#dce3dd";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 4; i += 1) {
    const y = padding.top + (plotHeight / 3) * i;
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
  }
  ctx.stroke();

  ctx.fillStyle = "#66736d";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  [high, (high + low) / 2, low].forEach((value) => {
    ctx.fillText(formatChartValue(value, suffix), padding.left - 8, yFor(value));
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = xFor(index);
    const y = yFor(point.value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = color;
  points.forEach((point, index) => {
    const x = xFor(index);
    const y = yFor(point.value);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const first = points[0];
  const last = points[points.length - 1];
  ctx.fillStyle = "#66736d";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText(formatShortDate(first.date), padding.left, height - 10);
  ctx.textAlign = "right";
  ctx.fillText(formatShortDate(last.date), width - padding.right, height - 10);

  ctx.fillStyle = "#1d2522";
  ctx.font = "700 13px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(formatChartValue(last.value, suffix), width - padding.right, padding.top + 12);
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
