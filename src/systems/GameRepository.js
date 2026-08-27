const STORAGE_KEY = 'threshold_results';

export class LocalGameRepository {
    saveResult(result) {
        try {
            const results = this.getResults();
            results.push(result);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
        } catch (e) {
            console.warn('Não foi possível salvar o resultado localmente.', e);
        }
    }

    getResults() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
        } catch (e) {
            return [];
        }
    }
}
