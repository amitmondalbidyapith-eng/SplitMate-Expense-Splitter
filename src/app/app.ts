
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Expense {
  id: number;
  title: string;
  amount: number;
  paidBy: string;
  category: string;
  splitAmong: string[];
  date: string;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {

  members: string[] = ['Amit', 'Rahul', 'Priya'];
  expenses: Expense[] = [];

  newMember = '';
  activePage = 'Dashboard';
  showExpenseForm = false;
  notice = '';

  draft = {
    title: '',
    amount: 0,
    paidBy: 'Amit',
    category: 'Food'
  };

  ngOnInit(): void {
    try {
      const m = localStorage.getItem('splitmate_members');
      const e = localStorage.getItem('splitmate_expenses');

      if (m) this.members = JSON.parse(m);
      if (e) this.expenses = JSON.parse(e);

      if (!this.members.length) {
        this.members = ['Amit'];
      }
    } catch {
      this.members = ['Amit', 'Rahul', 'Priya'];
      this.expenses = [];
    }

    if (!this.members.includes(this.draft.paidBy)) {
      this.draft.paidBy = this.members[0];
    }
  }

  save(): void {
    localStorage.setItem(
      'splitmate_members',
      JSON.stringify(this.members)
    );

    localStorage.setItem(
      'splitmate_expenses',
      JSON.stringify(this.expenses)
    );
  }

  get totalExpense(): number {
    return this.expenses.reduce(
      (sum, item) => sum + item.amount, 0
    );
  }

  get averageShare(): number {
    return this.members.length
      ? this.totalExpense / this.members.length
      : 0;
  }

  get balances() {
    return this.members.map(name => {
      let paid = 0;
      let share = 0;

      for (const expense of this.expenses) {
        if (expense.paidBy === name) {
          paid += expense.amount;
        }

        if (
          expense.splitAmong.includes(name) &&
          expense.splitAmong.length
        ) {
          share += expense.amount / expense.splitAmong.length;
        }
      }

      return {
        name,
        paid,
        share,
        balance: paid - share
      };
    });
  }

  get settlements(): Settlement[] {
    const creditors = this.balances
      .filter(p => p.balance > 0.005)
      .map(p => ({
        name: p.name,
        amount: p.balance
      }));

    const debtors = this.balances
      .filter(p => p.balance < -0.005)
      .map(p => ({
        name: p.name,
        amount: -p.balance
      }));

    const result: Settlement[] = [];

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(
        debtors[i].amount,
        creditors[j].amount
      );

      result.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount: Math.round(amount * 100) / 100
      });

      debtors[i].amount -= amount;
      creditors[j].amount -= amount;

      if (debtors[i].amount < 0.005) i++;
      if (creditors[j].amount < 0.005) j++;
    }

    return result;
  }

  addMember(): void {
    const name = this.newMember.trim();

    if (!name) {
      this.showNotice('Please enter a member name.');
      return;
    }

    if (
      this.members.some(
        m => m.toLowerCase() === name.toLowerCase()
      )
    ) {
      this.showNotice('This member already exists.');
      return;
    }

    this.members = [...this.members, name];
    this.newMember = '';

    if (!this.draft.paidBy) {
      this.draft.paidBy = name;
    }

    this.save();
    this.showNotice(name + ' added successfully.');
  }

  removeMember(name: string): void {
    if (this.members.length <= 1) {
      this.showNotice('At least one member is required.');
      return;
    }

    if (
      this.expenses.some(
        e => e.paidBy === name ||
        e.splitAmong.includes(name)
      )
    ) {
      this.showNotice(
        'Delete related expenses before removing this member.'
      );
      return;
    }

    this.members = this.members.filter(m => m !== name);

    if (this.draft.paidBy === name) {
      this.draft.paidBy = this.members[0];
    }

    this.save();
  }

  addExpense(): void {
    const title = this.draft.title.trim();
    const amount = Number(this.draft.amount);

    if (
      !title ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !this.members.includes(this.draft.paidBy)
    ) {
      this.showNotice(
        'Enter a valid title, amount and payer.'
      );
      return;
    }

    this.expenses = [
      {
        id: Date.now(),
        title,
        amount: Math.round(amount * 100) / 100,
        paidBy: this.draft.paidBy,
        category: this.draft.category,
        splitAmong: [...this.members],
        date: new Date().toLocaleDateString()
      },
      ...this.expenses
    ];

    this.draft = {
      title: '',
      amount: 0,
      paidBy: this.members[0],
      category: 'Food'
    };

    this.showExpenseForm = false;
    this.save();
    this.showNotice('Expense added successfully.');
  }

  deleteExpense(id: number): void {
    this.expenses = this.expenses.filter(
      e => e.id !== id
    );

    this.save();
    this.showNotice('Expense deleted.');
  }

  setPage(page: string): void {
    this.activePage = page;
    this.showExpenseForm = false;
  }

  money(value: number): string {
    return Math.abs(value).toFixed(2);
  }

  showNotice(message: string): void {
    this.notice = message;
  }

  clearNotice(): void {
    this.notice = '';
  }
}
