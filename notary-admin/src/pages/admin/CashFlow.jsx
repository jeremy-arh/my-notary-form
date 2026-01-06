import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Bar, Doughnut } from 'react-chartjs-2';
import '../../lib/chartConfig'; // Register Chart.js components
import { defaultChartOptions } from '../../lib/chartConfig';

const CashFlow = () => {
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState('month'); // 'month' or 'custom'
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dailyView, setDailyView] = useState('table'); // 'table' or 'calendar'
  const [syncingGoogleAds, setSyncingGoogleAds] = useState(false);
  
  // Data
  const [stripeRevenues, setStripeRevenues] = useState([]);
  const [webserviceCosts, setWebserviceCosts] = useState([]);
  const [googleAdsCosts, setGoogleAdsCosts] = useState([]);
  const [notaryPayments, setNotaryPayments] = useState([]);
  const [otherCosts, setOtherCosts] = useState([]);
  
  // Modals
  const [isWebserviceModalOpen, setIsWebserviceModalOpen] = useState(false);
  const [isGoogleAdsModalOpen, setIsGoogleAdsModalOpen] = useState(false);
  const [isNotaryModalOpen, setIsNotaryModalOpen] = useState(false);
  const [isOtherCostModalOpen, setIsOtherCostModalOpen] = useState(false);
  const [isWebserviceListModalOpen, setIsWebserviceListModalOpen] = useState(false);
  const [isGoogleAdsListModalOpen, setIsGoogleAdsListModalOpen] = useState(false);
  const [isNotaryListModalOpen, setIsNotaryListModalOpen] = useState(false);
  const [isOtherCostListModalOpen, setIsOtherCostListModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Forms
  const [webserviceForm, setWebserviceForm] = useState({
    service_name: '',
    cost_amount: '',
    billing_period: 'monthly',
    billing_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    is_recurring: false,
    is_active: true
  });
  
  const [googleAdsForm, setGoogleAdsForm] = useState({
    cost_amount: '',
    cost_date: format(new Date(), 'yyyy-MM-dd'),
    campaign_name: '',
    description: ''
  });
  
  const [notaryForm, setNotaryForm] = useState({
    notary_name: '',
    payment_amount: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    submission_id: '',
    description: ''
  });
  
  const [otherCostForm, setOtherCostForm] = useState({
    cost_name: '',
    cost_amount: '',
    cost_date: format(new Date(), 'yyyy-MM-dd'),
    category: '',
    description: ''
  });

  useEffect(() => {
    fetchAllData();
  }, [selectedMonth, startDate, endDate, periodType]);

  // Reset to table view when switching to custom period
  useEffect(() => {
    if (periodType === 'custom' && dailyView === 'calendar') {
      setDailyView('table');
    }
  }, [periodType, dailyView]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStripeRevenues(),
        fetchWebserviceCosts(),
        fetchGoogleAdsCosts(),
        fetchNotaryPayments()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStripeRevenues = async () => {
    try {
      const { data: submissions, error } = await supabase
        .from('submission')
        .select('*, data')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const revenues = (submissions || [])
        .filter(sub => sub.data?.payment?.payment_status === 'paid')
        .map(sub => ({
          id: sub.id,
          amount: (sub.data.payment.amount_paid || 0) / 100,
          date: sub.data.payment.paid_at || sub.created_at,
          customer: `${sub.first_name} ${sub.last_name}`
        }));

      setStripeRevenues(revenues);
    } catch (error) {
      console.error('Error fetching Stripe revenues:', error);
    }
  };

  const fetchWebserviceCosts = async () => {
    try {
      const { data, error } = await supabase
        .from('webservice_costs')
        .select('*')
        .order('billing_date', { ascending: false });

      if (error) throw error;
      setWebserviceCosts(data || []);
    } catch (error) {
      console.error('Error fetching webservice costs:', error);
    }
  };

  const toggleWebserviceActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('webservice_costs')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      fetchWebserviceCosts();
    } catch (error) {
      console.error('Error toggling webservice active status:', error);
      alert('Erreur lors de la modification: ' + error.message);
    }
  };

  const fetchGoogleAdsCosts = async () => {
    try {
      const { data, error } = await supabase
        .from('google_ads_costs')
        .select('*')
        .order('cost_date', { ascending: false });

      if (error) throw error;
      setGoogleAdsCosts(data || []);
    } catch (error) {
      console.error('Error fetching Google Ads costs:', error);
    }
  };

  const syncGoogleAdsCosts = async () => {
    setSyncingGoogleAds(true);
    try {
      // Appeler la Supabase Edge Function pour synchroniser les coûts
      const { data, error } = await supabase.functions.invoke('sync-google-ads-costs', {
        body: {}
      });

      if (error) throw error;

      // Rafraîchir les données après synchronisation
      await fetchGoogleAdsCosts();
      
      alert('Synchronisation Google Ads terminée avec succès !');
    } catch (error) {
      console.error('Error syncing Google Ads costs:', error);
      alert('Erreur lors de la synchronisation: ' + (error.message || 'Vérifiez que la fonction Edge est déployée et configurée'));
    } finally {
      setSyncingGoogleAds(false);
    }
  };

  const fetchNotaryPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('notary_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setNotaryPayments(data || []);
    } catch (error) {
      console.error('Error fetching notary payments:', error);
    }
  };

  const fetchOtherCosts = async () => {
    try {
      const { data, error } = await supabase
        .from('other_costs')
        .select('*')
        .order('cost_date', { ascending: false });

      if (error) throw error;
      setOtherCosts(data || []);
    } catch (error) {
      console.error('Error fetching other costs:', error);
    }
  };

  // Get period dates
  const getPeriodDates = () => {
    if (periodType === 'month') {
      return {
        start: startOfDay(startOfMonth(parseISO(`${selectedMonth}-01`))),
        end: endOfDay(endOfMonth(parseISO(`${selectedMonth}-01`)))
      };
    } else {
      return {
        start: startOfDay(parseISO(startDate)),
        end: endOfDay(parseISO(endDate))
      };
    }
  };

  // Calculate KPIs
  const calculateKPIs = () => {
    const { start: periodStart, end: periodEnd } = getPeriodDates();

    // Revenues (Stripe)
    const periodRevenues = stripeRevenues.filter(r => {
      const revenueDate = parseISO(r.date);
      return revenueDate >= periodStart && revenueDate <= periodEnd;
    });
    const totalRevenue = periodRevenues.reduce((sum, r) => sum + r.amount, 0);

    // Costs - Webservices (les lignes récurrentes sont déjà générées par le cron)
    const periodWebserviceCosts = webserviceCosts.filter(c => {
      const costDate = parseISO(c.billing_date);
      return costDate >= periodStart && costDate <= periodEnd;
    });
    const totalWebserviceCosts = periodWebserviceCosts.reduce((sum, c) => sum + parseFloat(c.cost_amount || 0), 0);

    const periodGoogleAdsCosts = googleAdsCosts.filter(c => {
      const costDate = parseISO(c.cost_date);
      return costDate >= periodStart && costDate <= periodEnd;
    });
    const totalGoogleAdsCosts = periodGoogleAdsCosts.reduce((sum, c) => sum + parseFloat(c.cost_amount || 0), 0);

    const periodNotaryPayments = notaryPayments.filter(p => {
      const paymentDate = parseISO(p.payment_date);
      return paymentDate >= periodStart && paymentDate <= periodEnd;
    });
    const totalNotaryPayments = periodNotaryPayments.reduce((sum, p) => sum + parseFloat(p.payment_amount || 0), 0);

    const periodOtherCosts = otherCosts.filter(c => {
      const costDate = parseISO(c.cost_date);
      return costDate >= periodStart && costDate <= periodEnd;
    });
    const totalOtherCosts = periodOtherCosts.reduce((sum, c) => sum + parseFloat(c.cost_amount || 0), 0);

    const totalCosts = totalWebserviceCosts + totalGoogleAdsCosts + totalNotaryPayments + totalOtherCosts;
    const margin = totalRevenue - totalCosts;
    const marginPercentage = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;

    // Calculate percentages
    const revenuePercentage = totalRevenue > 0 ? 100 : 0;
    const webservicePercentage = totalRevenue > 0 ? (totalWebserviceCosts / totalRevenue) * 100 : 0;
    const googleAdsPercentage = totalRevenue > 0 ? (totalGoogleAdsCosts / totalRevenue) * 100 : 0;
    const notaryPercentage = totalRevenue > 0 ? (totalNotaryPayments / totalRevenue) * 100 : 0;
    const otherCostsPercentage = totalRevenue > 0 ? (totalOtherCosts / totalRevenue) * 100 : 0;
    const costsPercentage = totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0;

    // MRR (Monthly Recurring Revenue) - moyenne des 3 derniers mois (only for month view)
    let mrr = 0;
    if (periodType === 'month') {
      const last3Months = [];
      for (let i = 0; i < 3; i++) {
        const month = new Date(periodStart);
        month.setMonth(month.getMonth() - i);
        const monthStartDate = startOfMonth(month);
        const monthEndDate = endOfMonth(month);
        
        const monthRev = stripeRevenues.filter(r => {
          const revenueDate = parseISO(r.date);
          return revenueDate >= monthStartDate && revenueDate <= monthEndDate;
        }).reduce((sum, r) => sum + r.amount, 0);
        
        last3Months.push(monthRev);
      }
      mrr = last3Months.reduce((sum, rev) => sum + rev, 0) / 3;
    } else {
      // For custom period, calculate average daily revenue * 30
      const daysDiff = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
      const avgDailyRevenue = daysDiff > 0 ? totalRevenue / daysDiff : 0;
      mrr = avgDailyRevenue * 30;
    }

    // Calculs supplémentaires pour les nouveaux KPI
    const numberOfSales = periodRevenues.length;
    const averageBasket = numberOfSales > 0 ? totalRevenue / numberOfSales : 0;
    
    // %conversion = (Revenu / Coûts Google Ads) * 100
    const conversionPercentage = totalGoogleAdsCosts > 0 ? (totalRevenue / totalGoogleAdsCosts) * 100 : 0;

    return {
      totalRevenue,
      totalCosts,
      margin,
      marginPercentage,
      mrr,
      totalWebserviceCosts,
      totalGoogleAdsCosts,
      totalNotaryPayments,
      totalOtherCosts,
      revenuePercentage,
      webservicePercentage,
      googleAdsPercentage,
      notaryPercentage,
      otherCostsPercentage,
      costsPercentage,
      numberOfSales,
      averageBasket,
      conversionPercentage
    };
  };

  const kpis = calculateKPIs();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Chart data for bar chart (raw data)
  const getBarChartData = () => {
    const { start: periodStart, end: periodEnd } = getPeriodDates();
    const days = eachDayOfInterval({ start: periodStart, end: periodEnd });
    
    // If period is longer than 60 days, group by week
    const daysDiff = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
    const shouldGroupByWeek = daysDiff > 60;
    
    if (shouldGroupByWeek) {
      // Group by week
      const weeks = [];
      let currentWeekStart = periodStart;
      
      while (currentWeekStart <= periodEnd) {
        let weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (weekEnd > periodEnd) weekEnd = new Date(periodEnd);
        
        const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
        let weekRevenue = 0;
        let weekGoogleAds = 0;
        let weekNotary = 0;
        let weekWebservice = 0;
        let weekOtherCosts = 0;
        
        weekDays.forEach(day => {
          const dayRevenues = stripeRevenues.filter(r => {
            const revenueDate = parseISO(r.date);
            return isSameDay(revenueDate, day);
          });
          weekRevenue += dayRevenues.reduce((sum, r) => sum + r.amount, 0);

          const dayGoogleAds = googleAdsCosts.filter(c => {
            const costDate = parseISO(c.cost_date);
            return isSameDay(costDate, day);
          });
          weekGoogleAds += dayGoogleAds.reduce((sum, c) => sum + parseFloat(c.cost_amount || 0), 0);

          const dayNotary = notaryPayments.filter(p => {
            const paymentDate = parseISO(p.payment_date);
            return isSameDay(paymentDate, day);
          });
          weekNotary += dayNotary.reduce((sum, p) => sum + parseFloat(p.payment_amount || 0), 0);

          // Webservices (les lignes sont déjà générées par le cron)
          const dayWebservice = webserviceCosts.filter(c => {
            const costDate = parseISO(c.billing_date);
            return isSameDay(costDate, day);
          });
          weekWebservice += dayWebservice.reduce((sum, c) => sum + parseFloat(c.cost_amount || 0), 0);

          const dayOtherCosts = otherCosts.filter(c => {
            const costDate = parseISO(c.cost_date);
            return isSameDay(costDate, day);
          });
          weekOtherCosts += dayOtherCosts.reduce((sum, c) => sum + parseFloat(c.cost_amount || 0), 0);
        });
        
        weeks.push({
          date: `${format(currentWeekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`,
          dateFull: format(currentWeekStart, 'yyyy-MM-dd'),
          revenue: weekRevenue,
          googleAds: weekGoogleAds,
          notary: weekNotary,
          webservice: weekWebservice,
          otherCosts: weekOtherCosts,
          totalCosts: weekGoogleAds + weekNotary + weekWebservice + weekOtherCosts,
          net: weekRevenue - weekGoogleAds - weekNotary - weekWebservice - weekOtherCosts
        });
        
        currentWeekStart = new Date(weekEnd);
        currentWeekStart.setDate(currentWeekStart.getDate() + 1);
      }
      
      return weeks;
    }
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      const dayRevenues = stripeRevenues.filter(r => {
        const revenueDate = parseISO(r.date);
        return isSameDay(revenueDate, day);
      });
      const dayRevenue = dayRevenues.reduce((sum, r) => sum + r.amount, 0);

      const dayGoogleAds = googleAdsCosts.filter(c => {
        const costDate = parseISO(c.cost_date);
        return isSameDay(costDate, day);
      });
      const dayGoogleAdsCost = dayGoogleAds.reduce((sum, c) => sum + parseFloat(c.cost_amount || 0), 0);

      const dayNotary = notaryPayments.filter(p => {
        const paymentDate = parseISO(p.payment_date);
        return isSameDay(paymentDate, day);
      });
      const dayNotaryCost = dayNotary.reduce((sum, p) => sum + parseFloat(p.payment_amount || 0), 0);

      // Webservices récurrents
      let dayWebserviceCost = 0;
      webserviceCosts.forEach(cost => {
        if (cost.billing_period === 'monthly') {
          const billingDay = parseISO(cost.billing_date).getDate();
          const dayOfMonth = day.getDate();
          const lastDayOfMonth = endOfMonth(day).getDate();
          if (dayOfMonth === billingDay || (dayOfMonth === lastDayOfMonth && billingDay > lastDayOfMonth)) {
            dayWebserviceCost += parseFloat(cost.cost_amount || 0);
          }
        } else {
          const costDate = parseISO(cost.billing_date);
          if (isSameDay(costDate, day)) {
            dayWebserviceCost += parseFloat(cost.cost_amount || 0);
          }
        }
      });

      const dayOtherCosts = otherCosts.filter(c => {
        const costDate = parseISO(c.cost_date);
        return isSameDay(costDate, day);
      });
      const dayOtherCostsAmount = dayOtherCosts.reduce((sum, c) => sum + parseFloat(c.cost_amount || 0), 0);

      return {
        date: format(day, 'dd/MM'),
        dateFull: dayStr,
        revenue: dayRevenue,
        googleAds: dayGoogleAdsCost,
        notary: dayNotaryCost,
        webservice: dayWebserviceCost,
        otherCosts: dayOtherCostsAmount,
        totalCosts: dayGoogleAdsCost + dayNotaryCost + dayWebserviceCost + dayOtherCostsAmount,
        net: dayRevenue - dayGoogleAdsCost - dayNotaryCost - dayWebserviceCost - dayOtherCostsAmount
      };
    });
  };

  // Pie chart data for costs distribution
  const getPieChartData = () => {
    return [
      { name: 'Webservices', value: kpis.totalWebserviceCosts, percentage: kpis.webservicePercentage },
      { name: 'Google Ads', value: kpis.totalGoogleAdsCosts, percentage: kpis.googleAdsPercentage },
      { name: 'Notaires', value: kpis.totalNotaryPayments, percentage: kpis.notaryPercentage },
      { name: 'Autres coûts', value: kpis.totalOtherCosts, percentage: kpis.otherCostsPercentage }
    ].filter(item => item.value > 0);
  };

  // Prepare Chart.js data
  const barChartRawData = getBarChartData();
  const barChartData = {
    labels: barChartRawData.map(item => item.date),
    datasets: [
      {
        label: 'Revenus',
        data: barChartRawData.map(item => item.revenue),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: '#10b981',
        borderWidth: 1
      },
      {
        label: 'Google Ads',
        data: barChartRawData.map(item => item.googleAds),
        backgroundColor: 'rgba(249, 115, 22, 0.8)',
        borderColor: '#f97316',
        borderWidth: 1
      },
      {
        label: 'Notaires',
        data: barChartRawData.map(item => item.notary),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: '#ef4444',
        borderWidth: 1
      },
      {
        label: 'Webservices',
        data: barChartRawData.map(item => item.webservice),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: '#6366f1',
        borderWidth: 1
      },
      {
        label: 'Autres coûts',
        data: barChartRawData.map(item => item.otherCosts || 0),
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: '#a855f7',
        borderWidth: 1
      }
    ]
  };

  const barChartOptions = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      tooltip: {
        ...defaultChartOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      ...defaultChartOptions.scales,
      y: {
        ...defaultChartOptions.scales.y,
        ticks: {
          ...defaultChartOptions.scales.y.ticks,
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  const pieChartRawData = getPieChartData();
  const doughnutChartData = {
    labels: pieChartRawData.map(item => item.name),
    datasets: [
      {
        data: pieChartRawData.map(item => item.value),
        backgroundColor: ['#6366f1', '#f97316', '#ef4444', '#a855f7'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  const doughnutChartOptions = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      legend: {
        ...defaultChartOptions.plugins.legend,
        position: 'bottom'
      },
      tooltip: {
        ...defaultChartOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Calendar data (only for month view)
  const getCalendarData = () => {
    if (periodType !== 'month') return [];
    
    const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
    const monthEnd = endOfMonth(parseISO(`${selectedMonth}-01`));
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      const dayRevenues = stripeRevenues.filter(r => {
        const revenueDate = parseISO(r.date);
        return isSameDay(revenueDate, day);
      });
      const dayRevenue = dayRevenues.reduce((sum, r) => sum + r.amount, 0);

      const dayGoogleAds = googleAdsCosts.filter(c => {
        const costDate = parseISO(c.cost_date);
        return isSameDay(costDate, day);
      });
      const dayGoogleAdsCost = dayGoogleAds.reduce((sum, c) => sum + parseFloat(c.cost_amount || 0), 0);

      const dayNotary = notaryPayments.filter(p => {
        const paymentDate = parseISO(p.payment_date);
        return isSameDay(paymentDate, day);
      });
      const dayNotaryCost = dayNotary.reduce((sum, p) => sum + parseFloat(p.payment_amount || 0), 0);

      return {
        date: day,
        dateStr: dayStr,
        revenue: dayRevenue,
        googleAdsCost: dayGoogleAdsCost,
        notaryCost: dayNotaryCost,
        net: dayRevenue - dayGoogleAdsCost - dayNotaryCost
      };
    });
  };

  const calendarData = getCalendarData();

  // Daily indicators data for table
  const getDailyIndicators = () => {
    const { start: periodStart, end: periodEnd } = getPeriodDates();
    const days = eachDayOfInterval({ start: periodStart, end: periodEnd });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      // Revenus du jour
      const dayRevenues = stripeRevenues.filter(r => {
        const revenueDate = parseISO(r.date);
        return isSameDay(revenueDate, day);
      });
      const dayRevenue = dayRevenues.reduce((sum, r) => sum + r.amount, 0);
      const numberOfSales = dayRevenues.length;
      const averageUnitRevenue = numberOfSales > 0 ? dayRevenue / numberOfSales : 0;

      // Coûts Google Ads du jour
      const dayGoogleAds = googleAdsCosts.filter(c => {
        const costDate = parseISO(c.cost_date);
        return isSameDay(costDate, day);
      });
      const dayGoogleAdsCost = dayGoogleAds.reduce((sum, c) => sum + parseFloat(c.cost_amount || 0), 0);

      // Coûts notaires du jour
      const dayNotary = notaryPayments.filter(p => {
        const paymentDate = parseISO(p.payment_date);
        return isSameDay(paymentDate, day);
      });
      const dayNotaryCost = dayNotary.reduce((sum, p) => sum + parseFloat(p.payment_amount || 0), 0);

      // Marge brute = Revenu total - Coûts Google Ads - Coûts notaires
      const grossMargin = dayRevenue - dayGoogleAdsCost - dayNotaryCost;

      // ROAS = Revenu total / Coûts Google Ads (si coûts > 0)
      const roas = dayGoogleAdsCost > 0 ? dayRevenue / dayGoogleAdsCost : null;

      return {
        date: day,
        dateStr: dayStr,
        dateFormatted: format(day, 'dd-MMM-yyyy', { locale: fr }),
        googleAds: dayGoogleAdsCost,
        notaryCost: dayNotaryCost,
        numberOfSales: numberOfSales,
        averageUnitRevenue: averageUnitRevenue,
        totalRevenue: dayRevenue,
        grossMargin: grossMargin,
        roas: roas
      };
    });
  };

  const dailyIndicators = getDailyIndicators();

  // Save handlers
  const handleSaveWebservice = async () => {
    try {
      const costData = {
        service_name: webserviceForm.service_name,
        cost_amount: parseFloat(webserviceForm.cost_amount),
        billing_period: webserviceForm.billing_period,
        billing_date: webserviceForm.billing_date,
        description: webserviceForm.description || null,
        is_recurring: webserviceForm.billing_period === 'monthly' ? (webserviceForm.is_recurring || false) : false,
        is_active: webserviceForm.is_active !== undefined ? webserviceForm.is_active : true
      };

      if (editingItem) {
        const { error } = await supabase
          .from('webservice_costs')
          .update(costData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('webservice_costs')
          .insert([costData]);
        if (error) throw error;
      }

      setIsWebserviceModalOpen(false);
      setEditingItem(null);
      fetchWebserviceCosts();
    } catch (error) {
      console.error('Error saving webservice cost:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  };

  const handleSaveGoogleAds = async () => {
    try {
      const costData = {
        ...googleAdsForm,
        cost_amount: parseFloat(googleAdsForm.cost_amount)
      };

      if (editingItem) {
        const { error } = await supabase
          .from('google_ads_costs')
          .update(costData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('google_ads_costs')
          .insert([costData]);
        if (error) throw error;
      }

      setIsGoogleAdsModalOpen(false);
      setEditingItem(null);
      fetchGoogleAdsCosts();
    } catch (error) {
      console.error('Error saving Google Ads cost:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  };

  const handleSaveNotary = async () => {
    try {
      const paymentData = {
        ...notaryForm,
        payment_amount: parseFloat(notaryForm.payment_amount),
        submission_id: notaryForm.submission_id || null
      };

      if (editingItem) {
        const { error } = await supabase
          .from('notary_payments')
          .update(paymentData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notary_payments')
          .insert([paymentData]);
        if (error) throw error;
      }

      setIsNotaryModalOpen(false);
      setEditingItem(null);
      fetchNotaryPayments();
    } catch (error) {
      console.error('Error saving notary payment:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  };

  const handleDeleteWebservice = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce coût webservice ?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('webservice_costs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchWebserviceCosts();
    } catch (error) {
      console.error('Error deleting webservice cost:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleDeleteGoogleAds = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce coût Google Ads ?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('google_ads_costs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchGoogleAdsCosts();
    } catch (error) {
      console.error('Error deleting Google Ads cost:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleDeleteNotary = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce versement notaire ?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('notary_payments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchNotaryPayments();
    } catch (error) {
      console.error('Error deleting notary payment:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleSaveOtherCost = async () => {
    try {
      const costData = {
        ...otherCostForm,
        cost_amount: parseFloat(otherCostForm.cost_amount)
      };

      if (editingItem) {
        const { error } = await supabase
          .from('other_costs')
          .update(costData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('other_costs')
          .insert([costData]);
        if (error) throw error;
      }

      setIsOtherCostModalOpen(false);
      setEditingItem(null);
      fetchOtherCosts();
    } catch (error) {
      console.error('Error saving other cost:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  };

  const handleDeleteOtherCost = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce coût ?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('other_costs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchOtherCosts();
    } catch (error) {
      console.error('Error deleting other cost:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Suivi de Trésorerie</h1>
            <p className="text-gray-600 mt-2">Gestion complète des revenus et coûts</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setPeriodType('month')}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  periodType === 'month'
                    ? 'bg-black text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Mois
              </button>
              <button
                onClick={() => setPeriodType('custom')}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  periodType === 'custom'
                    ? 'bg-black text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Période personnalisée
              </button>
            </div>
            {periodType === 'month' ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
              />
            ) : (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                />
                <span className="flex items-center text-gray-600">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
            )}
          </div>
        </div>

        {/* Nouveaux KPI en haut */}
        <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Indicateurs Clés</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-600 mb-1">Gads</div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalGoogleAdsCosts)}</p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-600 mb-1">Notaire</div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalNotaryPayments)}</p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-600 mb-1">%conversion</div>
              <p className="text-2xl font-bold text-gray-900">{kpis.conversionPercentage.toFixed(2)}%</p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-600 mb-1">%marge</div>
              <p className={`text-2xl font-bold ${kpis.marginPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpis.marginPercentage.toFixed(2)}%
              </p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-600 mb-1">Revenu</div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalRevenue)}</p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-600 mb-1">Panier moyen</div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.averageBasket)}</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">MRR</span>
              <Icon icon="heroicons:chart-line" className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.mrr)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {periodType === 'month' ? 'Moyenne sur 3 mois' : 'Projeté sur 30 jours'}
            </p>
          </div>

          <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">Revenus</span>
              <Icon icon="heroicons:arrow-trending-up" className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">{kpis.revenuePercentage.toFixed(1)}% du total</p>
          </div>

          <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">Marge</span>
              <Icon icon="heroicons:currency-euro" className="w-5 h-5 text-blue-500" />
            </div>
            <p className={`text-2xl font-bold ${kpis.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(kpis.margin)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{kpis.marginPercentage.toFixed(1)}% de marge</p>
          </div>

          <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">Coûts Totaux</span>
              <Icon icon="heroicons:arrow-trending-down" className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalCosts)}</p>
            <p className="text-xs text-gray-500 mt-1">{kpis.costsPercentage.toFixed(1)}% des revenus</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Revenus et Coûts par Jour</h2>
            <div style={{ height: '300px' }}>
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>

          {/* Doughnut Chart */}
          <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Répartition des Coûts</h2>
            <div style={{ height: '300px' }}>
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setIsWebserviceListModalOpen(true)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Webservices</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingItem(null);
                  setWebserviceForm({
                    service_name: '',
                    cost_amount: '',
                    billing_period: 'monthly',
                    billing_date: format(new Date(), 'yyyy-MM-dd'),
                    description: '',
                    is_recurring: false,
                    is_active: true
                  });
                  setIsWebserviceModalOpen(true);
                }}
                className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all"
              >
                <Icon icon="heroicons:plus" className="w-4 h-4" />
              </button>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(kpis.totalWebserviceCosts)}</p>
            <p className="text-sm text-gray-600 mt-2">{kpis.webservicePercentage.toFixed(1)}% des revenus</p>
          </div>

          <div 
            className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setIsGoogleAdsListModalOpen(true)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Google Ads</h3>
              <div className="flex gap-2">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await syncGoogleAdsCosts();
                  }}
                  disabled={syncingGoogleAds}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Synchroniser depuis l'API Google Ads"
                >
                  <Icon icon={syncingGoogleAds ? "heroicons:arrow-path" : "heroicons:arrow-path"} className={`w-4 h-4 ${syncingGoogleAds ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingItem(null);
                    setGoogleAdsForm({
                      cost_amount: '',
                      cost_date: format(new Date(), 'yyyy-MM-dd'),
                      campaign_name: '',
                      description: ''
                    });
                    setIsGoogleAdsModalOpen(true);
                  }}
                  className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all"
                >
                  <Icon icon="heroicons:plus" className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(kpis.totalGoogleAdsCosts)}</p>
            <p className="text-sm text-gray-600 mt-2">{kpis.googleAdsPercentage.toFixed(1)}% des revenus</p>
          </div>

          <div 
            className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setIsNotaryListModalOpen(true)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Versements Notaires</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingItem(null);
                  setNotaryForm({
                    notary_name: '',
                    payment_amount: '',
                    payment_date: format(new Date(), 'yyyy-MM-dd'),
                    submission_id: '',
                    description: ''
                  });
                  setIsNotaryModalOpen(true);
                }}
                className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all"
              >
                <Icon icon="heroicons:plus" className="w-4 h-4" />
              </button>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(kpis.totalNotaryPayments)}</p>
            <p className="text-sm text-gray-600 mt-2">{kpis.notaryPercentage.toFixed(1)}% des revenus</p>
          </div>

          <div 
            className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setIsOtherCostListModalOpen(true)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Autres coûts</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingItem(null);
                  setOtherCostForm({
                    cost_name: '',
                    cost_amount: '',
                    cost_date: format(new Date(), 'yyyy-MM-dd'),
                    category: '',
                    description: ''
                  });
                  setIsOtherCostModalOpen(true);
                }}
                className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all"
              >
                <Icon icon="heroicons:plus" className="w-4 h-4" />
              </button>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(kpis.totalOtherCosts)}</p>
            <p className="text-sm text-gray-600 mt-2">{kpis.otherCostsPercentage.toFixed(1)}% des revenus</p>
          </div>
        </div>

        {/* Tableau des indicateurs quotidiens et Calendrier */}
        <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {dailyView === 'table' ? 'Indicateurs Quotidiens' : `Calendrier - ${format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: fr })}`}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setDailyView('table')}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  dailyView === 'table'
                    ? 'bg-black text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Tableau
              </button>
              {periodType === 'month' && (
                <button
                  onClick={() => setDailyView('calendar')}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                    dailyView === 'calendar'
                      ? 'bg-black text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Calendrier
                </button>
              )}
            </div>
          </div>

          {dailyView === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Gads</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Cout notaire</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900"># Nbrs de vente</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Revenu moyen unitaire</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Revenu total</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Marge Brute</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyIndicators.map((day, index) => (
                    <tr 
                      key={day.dateStr} 
                      className={`border-b border-gray-200 hover:bg-gray-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {format(day.date, 'dd', { locale: fr })}-{format(day.date, 'MMMM', { locale: fr })}-{format(day.date, 'yyyy', { locale: fr })}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {day.googleAds > 0 ? formatCurrency(day.googleAds) : '0,00 €'}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {day.notaryCost > 0 ? formatCurrency(day.notaryCost) : '0,00 €'}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900 font-semibold">
                        {day.numberOfSales}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {day.averageUnitRevenue > 0 ? formatCurrency(day.averageUnitRevenue) : '0,00 €'}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900 font-semibold">
                        {day.totalRevenue > 0 ? formatCurrency(day.totalRevenue) : '0,00 €'}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${
                        day.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(day.grossMargin)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {day.roas !== null ? (
                          <span className={day.roas >= 1 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {day.roas.toFixed(2)}x
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            periodType === 'month' && (
              <div className="grid grid-cols-7 gap-2">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
                {/* Empty cells for days before the first day of the month */}
                {(() => {
                  const firstDay = calendarData[0]?.date;
                  if (!firstDay) return null;
                  const firstDayOfWeek = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
                  const emptyCells = [];
                  for (let i = 1; i < firstDayOfWeek; i++) {
                    emptyCells.push(<div key={`empty-${i}`} className="bg-transparent" />);
                  }
                  return emptyCells;
                })()}
                {calendarData.map((day) => (
                  <div
                    key={day.dateStr}
                    className={`bg-white rounded-xl border-2 p-3 min-h-[100px] ${
                      day.net > 0 ? 'border-green-200' : day.net < 0 ? 'border-red-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="text-sm font-bold text-gray-900 mb-2">{day.date.getDate()}</div>
                    {day.revenue > 0 && (
                      <div className="text-xs text-green-600 font-semibold mb-1">
                        +{formatCurrency(day.revenue)}
                      </div>
                    )}
                    {day.googleAdsCost > 0 && (
                      <div className="text-xs text-orange-600">
                        Ads: -{formatCurrency(day.googleAdsCost)}
                      </div>
                    )}
                    {day.notaryCost > 0 && (
                      <div className="text-xs text-red-600">
                        Notaire: -{formatCurrency(day.notaryCost)}
                      </div>
                    )}
                    {day.net !== 0 && (
                      <div className={`text-xs font-bold mt-1 ${
                        day.net > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Net: {formatCurrency(day.net)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Modals will be added here */}
        {/* WebService Modal */}
        {isWebserviceModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingItem ? 'Modifier le coût' : 'Nouveau coût webservice'}
                </h2>
                <button
                  onClick={() => setIsWebserviceModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Nom du service *</label>
                  <input
                    type="text"
                    value={webserviceForm.service_name}
                    onChange={(e) => setWebserviceForm({ ...webserviceForm, service_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Montant *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={webserviceForm.cost_amount}
                      onChange={(e) => setWebserviceForm({ ...webserviceForm, cost_amount: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Période</label>
                    <select
                      value={webserviceForm.billing_period}
                      onChange={(e) => setWebserviceForm({ 
                        ...webserviceForm, 
                        billing_period: e.target.value,
                        is_recurring: e.target.value === 'monthly' ? webserviceForm.is_recurring : false
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                    >
                      <option value="monthly">Mensuel</option>
                      <option value="annually">Annuel</option>
                      <option value="one-time">Unique</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Date de facturation *</label>
                  <input
                    type="date"
                    value={webserviceForm.billing_date}
                    onChange={(e) => setWebserviceForm({ ...webserviceForm, billing_date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                    required
                  />
                  {webserviceForm.billing_period === 'monthly' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Pour les coûts récurrents, le cron créera une ligne chaque mois à cette date
                    </p>
                  )}
                </div>
                {webserviceForm.billing_period === 'monthly' && (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <input
                        type="checkbox"
                        id="is_recurring"
                        checked={webserviceForm.is_recurring || false}
                        onChange={(e) => setWebserviceForm({ ...webserviceForm, is_recurring: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-black focus:ring-2 focus:ring-black"
                      />
                      <label htmlFor="is_recurring" className="text-sm font-semibold text-gray-900 cursor-pointer">
                        Activer la récurrence automatique (cron génère les lignes mensuelles)
                      </label>
                    </div>
                    {webserviceForm.is_recurring && (
                      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={webserviceForm.is_active !== undefined ? webserviceForm.is_active : true}
                          onChange={(e) => setWebserviceForm({ ...webserviceForm, is_active: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-black focus:ring-2 focus:ring-black"
                        />
                        <label htmlFor="is_active" className="text-sm font-semibold text-gray-900 cursor-pointer">
                          Actif (le cron générera les lignes mensuelles automatiquement)
                        </label>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                  <textarea
                    value={webserviceForm.description}
                    onChange={(e) => setWebserviceForm({ ...webserviceForm, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                    rows="3"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleSaveWebservice}
                    className="flex-1 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 font-semibold"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setIsWebserviceModalOpen(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Google Ads Modal */}
        {isGoogleAdsModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingItem ? 'Modifier le coût' : 'Nouveau coût Google Ads'}
                </h2>
                <button
                  onClick={() => setIsGoogleAdsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Montant *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={googleAdsForm.cost_amount}
                      onChange={(e) => setGoogleAdsForm({ ...googleAdsForm, cost_amount: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Date *</label>
                    <input
                      type="date"
                      value={googleAdsForm.cost_date}
                      onChange={(e) => setGoogleAdsForm({ ...googleAdsForm, cost_date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Nom de la campagne</label>
                  <input
                    type="text"
                    value={googleAdsForm.campaign_name}
                    onChange={(e) => setGoogleAdsForm({ ...googleAdsForm, campaign_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                  <textarea
                    value={googleAdsForm.description}
                    onChange={(e) => setGoogleAdsForm({ ...googleAdsForm, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                    rows="3"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleSaveGoogleAds}
                    className="flex-1 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 font-semibold"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setIsGoogleAdsModalOpen(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notary Modal */}
        {isNotaryModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingItem ? 'Modifier le versement' : 'Nouveau versement notaire'}
                </h2>
                <button
                  onClick={() => setIsNotaryModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Nom du notaire *</label>
                  <input
                    type="text"
                    value={notaryForm.notary_name}
                    onChange={(e) => setNotaryForm({ ...notaryForm, notary_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Montant *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={notaryForm.payment_amount}
                      onChange={(e) => setNotaryForm({ ...notaryForm, payment_amount: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Date *</label>
                    <input
                      type="date"
                      value={notaryForm.payment_date}
                      onChange={(e) => setNotaryForm({ ...notaryForm, payment_date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">ID Soumission (optionnel)</label>
                  <input
                    type="text"
                    value={notaryForm.submission_id}
                    onChange={(e) => setNotaryForm({ ...notaryForm, submission_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                  <textarea
                    value={notaryForm.description}
                    onChange={(e) => setNotaryForm({ ...notaryForm, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black"
                    rows="3"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleSaveNotary}
                    className="flex-1 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 font-semibold"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setIsNotaryModalOpen(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WebService List Modal */}
        {isWebserviceListModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6 p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Détails des coûts Webservices</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {periodType === 'month' 
                      ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: fr })
                      : `${format(parseISO(startDate), 'dd MMMM yyyy', { locale: fr })} - ${format(parseISO(endDate), 'dd MMMM yyyy', { locale: fr })}`}
                  </p>
                </div>
                <button
                  onClick={() => setIsWebserviceListModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
                {(() => {
                  const { start: periodStart, end: periodEnd } = getPeriodDates();
                  const filteredCosts = webserviceCosts.filter(c => {
                    const costDate = parseISO(c.billing_date);
                    return costDate >= periodStart && costDate <= periodEnd;
                  });

                  if (filteredCosts.length === 0) {
                    return <p className="text-gray-600 text-center py-8">Aucun coût pour cette période</p>;
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Service</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Montant</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Période</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Récurrent</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Statut</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCosts.map((cost) => (
                            <tr key={cost.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">{cost.service_name}</td>
                              <td className="py-3 px-4 text-gray-900 font-semibold">{formatCurrency(parseFloat(cost.cost_amount || 0))}</td>
                              <td className="py-3 px-4 text-gray-600">
                                {cost.billing_period === 'monthly' ? 'Mensuel' : cost.billing_period === 'annually' ? 'Annuel' : 'Unique'}
                              </td>
                              <td className="py-3 px-4 text-gray-600">{format(parseISO(cost.billing_date), 'dd/MM/yyyy', { locale: fr })}</td>
                              <td className="py-3 px-4 text-gray-600">
                                {cost.is_recurring ? (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Oui</span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">Non</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {cost.is_recurring && (
                                  <button
                                    onClick={() => toggleWebserviceActive(cost.id, cost.is_active)}
                                    className={`px-2 py-1 rounded-full text-xs font-semibold transition-all ${
                                      cost.is_active
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                                    }`}
                                  >
                                    {cost.is_active ? 'Actif' : 'Inactif'}
                                  </button>
                                )}
                                {!cost.is_recurring && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-gray-600">{cost.description || '-'}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingItem(cost);
                                      setWebserviceForm({
                                        service_name: cost.service_name,
                                        cost_amount: cost.cost_amount,
                                        billing_period: cost.billing_period,
                                        billing_date: cost.billing_date,
                                        description: cost.description || '',
                                        is_recurring: cost.is_recurring || false,
                                        is_active: cost.is_active !== undefined ? cost.is_active : true
                                      });
                                      setIsWebserviceListModalOpen(false);
                                      setIsWebserviceModalOpen(true);
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  >
                                    <Icon icon="heroicons:pencil" className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteWebservice(cost.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Icon icon="heroicons:trash" className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Google Ads List Modal */}
        {isGoogleAdsListModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6 p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Détails des coûts Google Ads</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {periodType === 'month' 
                      ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: fr })
                      : `${format(parseISO(startDate), 'dd MMMM yyyy', { locale: fr })} - ${format(parseISO(endDate), 'dd MMMM yyyy', { locale: fr })}`}
                  </p>
                </div>
                <button
                  onClick={() => setIsGoogleAdsListModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
                {(() => {
                  const { start: periodStart, end: periodEnd } = getPeriodDates();
                  const filteredCosts = googleAdsCosts.filter(c => {
                    const costDate = parseISO(c.cost_date);
                    return costDate >= periodStart && costDate <= periodEnd;
                  });

                  if (filteredCosts.length === 0) {
                    return <p className="text-gray-600 text-center py-8">Aucun coût pour cette période</p>;
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Montant</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Campagne</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCosts.map((cost) => (
                            <tr key={cost.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">{format(parseISO(cost.cost_date), 'dd/MM/yyyy', { locale: fr })}</td>
                              <td className="py-3 px-4 text-gray-900 font-semibold">{formatCurrency(parseFloat(cost.cost_amount || 0))}</td>
                              <td className="py-3 px-4 text-gray-600">{cost.campaign_name || '-'}</td>
                              <td className="py-3 px-4 text-gray-600">{cost.description || '-'}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingItem(cost);
                                      setGoogleAdsForm({
                                        cost_amount: cost.cost_amount,
                                        cost_date: cost.cost_date,
                                        campaign_name: cost.campaign_name || '',
                                        description: cost.description || ''
                                      });
                                      setIsGoogleAdsListModalOpen(false);
                                      setIsGoogleAdsModalOpen(true);
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  >
                                    <Icon icon="heroicons:pencil" className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGoogleAds(cost.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Icon icon="heroicons:trash" className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Notary Payments List Modal */}
        {isNotaryListModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6 p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Détails des versements Notaires</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {periodType === 'month' 
                      ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: fr })
                      : `${format(parseISO(startDate), 'dd MMMM yyyy', { locale: fr })} - ${format(parseISO(endDate), 'dd MMMM yyyy', { locale: fr })}`}
                  </p>
                </div>
                <button
                  onClick={() => setIsNotaryListModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
                {(() => {
                  const { start: periodStart, end: periodEnd } = getPeriodDates();
                  const filteredPayments = notaryPayments.filter(p => {
                    const paymentDate = parseISO(p.payment_date);
                    return paymentDate >= periodStart && paymentDate <= periodEnd;
                  });

                  if (filteredPayments.length === 0) {
                    return <p className="text-gray-600 text-center py-8">Aucun versement pour cette période</p>;
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Notaire</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Montant</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">ID Soumission</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayments.map((payment) => (
                            <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">{payment.notary_name || '-'}</td>
                              <td className="py-3 px-4 text-gray-900 font-semibold">{formatCurrency(parseFloat(payment.payment_amount || 0))}</td>
                              <td className="py-3 px-4 text-gray-600">{format(parseISO(payment.payment_date), 'dd/MM/yyyy', { locale: fr })}</td>
                              <td className="py-3 px-4 text-gray-600">{payment.submission_id || '-'}</td>
                              <td className="py-3 px-4 text-gray-600">{payment.description || '-'}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingItem(payment);
                                      setNotaryForm({
                                        notary_name: payment.notary_name || '',
                                        payment_amount: payment.payment_amount,
                                        payment_date: payment.payment_date,
                                        submission_id: payment.submission_id || '',
                                        description: payment.description || ''
                                      });
                                      setIsNotaryListModalOpen(false);
                                      setIsNotaryModalOpen(true);
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  >
                                    <Icon icon="heroicons:pencil" className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNotary(payment.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Icon icon="heroicons:trash" className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Other Costs List Modal */}
        {isOtherCostListModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6 p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Détails des autres coûts</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {periodType === 'month' 
                      ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: fr })
                      : `${format(parseISO(startDate), 'dd MMMM yyyy', { locale: fr })} - ${format(parseISO(endDate), 'dd MMMM yyyy', { locale: fr })}`}
                  </p>
                </div>
                <button
                  onClick={() => setIsOtherCostListModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
                {(() => {
                  const { start: periodStart, end: periodEnd } = getPeriodDates();
                  const filteredCosts = otherCosts.filter(c => {
                    const costDate = parseISO(c.cost_date);
                    return costDate >= periodStart && costDate <= periodEnd;
                  });

                  if (filteredCosts.length === 0) {
                    return <p className="text-gray-600 text-center py-8">Aucun coût pour cette période</p>;
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Nom</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Montant</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Catégorie</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCosts.map((cost) => (
                            <tr key={cost.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">{cost.cost_name}</td>
                              <td className="py-3 px-4 text-gray-900 font-semibold">{formatCurrency(parseFloat(cost.cost_amount || 0))}</td>
                              <td className="py-3 px-4 text-gray-600">{format(parseISO(cost.cost_date), 'dd/MM/yyyy', { locale: fr })}</td>
                              <td className="py-3 px-4 text-gray-600">{cost.category || '-'}</td>
                              <td className="py-3 px-4 text-gray-600">{cost.description || '-'}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingItem(cost);
                                      setOtherCostForm({
                                        cost_name: cost.cost_name,
                                        cost_amount: cost.cost_amount,
                                        cost_date: cost.cost_date,
                                        category: cost.category || '',
                                        description: cost.description || ''
                                      });
                                      setIsOtherCostListModalOpen(false);
                                      setIsOtherCostModalOpen(true);
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  >
                                    <Icon icon="heroicons:pencil" className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOtherCost(cost.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Icon icon="heroicons:trash" className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Other Cost Modal */}
        {isOtherCostModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingItem ? 'Modifier le coût' : 'Nouveau coût'}
                </h2>
                <button
                  onClick={() => setIsOtherCostModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Nom du coût *</label>
                  <input
                    type="text"
                    value={otherCostForm.cost_name}
                    onChange={(e) => setOtherCostForm({ ...otherCostForm, cost_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Montant (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={otherCostForm.cost_amount}
                    onChange={(e) => setOtherCostForm({ ...otherCostForm, cost_amount: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Date *</label>
                  <input
                    type="date"
                    value={otherCostForm.cost_date}
                    onChange={(e) => setOtherCostForm({ ...otherCostForm, cost_date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Catégorie</label>
                  <input
                    type="text"
                    value={otherCostForm.category}
                    onChange={(e) => setOtherCostForm({ ...otherCostForm, category: e.target.value })}
                    placeholder="Ex: Prestataire, Fournisseur, etc."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                  <textarea
                    value={otherCostForm.description}
                    onChange={(e) => setOtherCostForm({ ...otherCostForm, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                    rows="3"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleSaveOtherCost}
                    className="flex-1 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 font-semibold"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setIsOtherCostModalOpen(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CashFlow;

